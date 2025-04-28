import Client, {
  CommitmentLevel,
  SubscribeRequest,
  SubscribeUpdate,
  SubscribeUpdateTransaction,
} from "@triton-one/yellowstone-grpc";
import { ClientDuplexStream } from "@grpc/grpc-js";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
import { getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import { getBuyTxWithJupiter, getSellTxWithJupiter } from "./utils/swapOnlyAmm";
import { execute, getTokenMarketCap } from "./utils/legacy";
import { executeJitoTx } from "./utils/jito";
import { NumberSchemaDefinition } from "mongoose";
import { SettingProps } from "./types";

dotenv.config();

// Constants
const ENDPOINT = process.env.GRPC_ENDPOINT!;
const COMMITMENT = CommitmentLevel.PROCESSED;
const BASE_MINT_ADDRESS = process.env.BASE_MINT_ADDRESS;
const BUY_AMOUNT = Number(process.env.BUY_AMOUNT) || 0.001;

const solanaConnection = new Connection(process.env.RPC_ENDPOINT!, "confirmed");
const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

const TARGET_ADDRESS = process.env.TARGET_ADDRESS!;
const IS_JITO = process.env.IS_JITO!;

if (!TARGET_ADDRESS) console.log("Target Address is not defined");

console.log(
  "========================================= Your Config ======================================="
);
console.log("Target Wallet Address =====> ", TARGET_ADDRESS);
console.log("Bot Wallet Address    =====> ", keyPair.publicKey.toBase58());
console.log(
  "=============================================================================================== \n"
);

// Main function
async function main(): Promise<void> {
  const client = new Client(ENDPOINT, undefined, {});
  const stream = await client.subscribe();
  const request = createSubscribeRequest();

  try {
    await sendSubscribeRequest(stream, request);
    console.log(
      `Geyser connection established - watching ${TARGET_ADDRESS} \n`
    );
    await handleStreamEvents(stream);
  } catch (error) {
    console.error("Error in subscription process:", error);
    stream.end();
  }
}

// Helper functions
function createSubscribeRequest(): SubscribeRequest {
  return {
    accounts: {},
    slots: {},
    transactions: {
      client: {
        accountInclude: [],
        accountExclude: [],
        accountRequired: [TARGET_ADDRESS],
        failed: false,
      },
    },
    transactionsStatus: {},
    entry: {},
    blocks: {},
    blocksMeta: {},
    commitment: COMMITMENT,
    accountsDataSlice: [],
    ping: undefined,
  };
}

function sendSubscribeRequest(
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>,
  request: SubscribeRequest
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.write(request, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function handleStreamEvents(
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    stream.on("data", async (data) => {
      await handleData(data, stream);
    });
    stream.on("error", (error: Error) => {
      console.error("Stream error:", error);
      reject(error);
      stream.end();
    });
    stream.on("end", () => {
      console.log("Stream ended");
      resolve();
    });
    stream.on("close", () => {
      console.log("Stream closed");
      resolve();
    });
  });
}

async function handleData(
  data: SubscribeUpdate,
  stream: ClientDuplexStream<SubscribeRequest, SubscribeUpdate>
) {
  try {
    // const convertedTx = convertBuffers(data.transaction);
    // if (!JSON.stringify(convertedTx).includes(JUP_AGGREGATOR)) {
    //     console.log("Not a Jupiter swap");
    //     return;
    // }
    // console.log(JSON.stringify(convertedTx))
    if (!isSubscribeUpdateTransaction(data)) {
      return;
    }

    const transaction = data.transaction?.transaction;
    const message = transaction?.transaction?.message;

    if (!transaction || !message) {
      return;
    }

    const tokenAmount = getBalanceChange(data, "");
    if (tokenAmount) {
      const isBuy: boolean = tokenAmount > 0;

      const mint = getMintAccount(data);

      if (!mint) return;

      // if (mint == NATIVE_MINT.toBase58()) return;

      const formattedSignature = convertSignature(transaction.signature);
      console.log(
        "========================================= Target Wallet ======================================="
      );
      console.log(
        `${isBuy ? "Buy" : "Sell"} => https://solscan.io/tx/${
          formattedSignature.base58
        }`
      );
      console.log(
        "=============================================================================================== \n"
      );
      if (isBuy) {
        // const amount = BUY_AMOUNT;
        const solBalanceChange = getSolBalanceChange(data);
        const amount = Math.min(solBalanceChange / 10, 1);
        const buyTx = await getBuyTxWithJupiter(
          keyPair,
          new PublicKey(mint),
          Math.floor(amount * LAMPORTS_PER_SOL)
        );
        if (buyTx == null) {
          // console.log(`Error getting swap transaction`)
          return;
        }

        let txSig;
        if (IS_JITO == "true")
          txSig = await executeJitoTx([buyTx], keyPair, "confirmed");
        else txSig = await execute(solanaConnection, buyTx);
        const tokenTx = txSig ? `https://solscan.io/tx/${txSig}` : "";
        console.log(
          "========================================= Bot Wallet ======================================="
        );
        console.log("Bought Token: ", tokenTx);
        console.log(
          "=============================================================================================== \n"
        );
      } else {
        // const tokenIntAmount = Math.floor(-tokenAmount);
        const mainWalletBaseAta = await getAssociatedTokenAddress(
          new PublicKey(mint),
          keyPair.publicKey
        );
        // const targetWalletBaseAta = await getAssociatedTokenAddress(new PublicKey(mint), new PublicKey(TARGET_ADDRESS));
        const mainWalletTokenAmount = (
          await solanaConnection.getTokenAccountBalance(mainWalletBaseAta)
        ).value;
        const sellTx = await getSellTxWithJupiter(
          keyPair,
          new PublicKey(mint),
          Math.floor(Number(mainWalletTokenAmount.amount))
          // Math.floor(Number(SELL_AMOUNT))
        );
        if (sellTx == null) {
          // console.log(`Error getting swap transaction`)
          return;
        }

        let txSig;
        if (IS_JITO == "true") {
          txSig = await executeJitoTx([sellTx], keyPair, "confirmed");
        } else {
          txSig = await execute(solanaConnection, sellTx);
        }
        if (!txSig) return;
        const tokenTx = `https://solscan.io/tx/${txSig}`;
        console.log(
          "========================================= Bot Wallet ======================================="
        );
        console.log("Sold Token: ", tokenTx);
        console.log(
          "=============================================================================================== \n"
        );
      }
      return true;
    }
  } catch (error) {
    console.log(error);
  }
}

// Check token balance change of target wallet
const filterAccount = (accounts: any[], token: string): any | null => {
  return (
    accounts?.find((account) => {
      if (token === "") {
        return (
          account.owner === TARGET_ADDRESS && account.mint != BASE_MINT_ADDRESS
        );
      } else if (token === "base") {
        return (
          account.owner === TARGET_ADDRESS && account.mint == BASE_MINT_ADDRESS
        );
      } else if (token === "sol") {
        return account.mint == BASE_MINT_ADDRESS;
      }
      return false;
    }) || null
  );
};

const filterSolAccount = (accounts: any[]): any | null => {
  return (
    accounts?.find((account) => {
      return (
        account.mint == BASE_MINT_ADDRESS && account.uiTokenAmount.uiAmount != 0
      );
    }) || null
  );
};

const getBalanceChange = (
  data: SubscribeUpdate,
  token: string
): number | null => {
  const preAccounts = data.transaction?.transaction?.meta?.preTokenBalances;
  const postAccounts = data.transaction?.transaction?.meta?.postTokenBalances;
  if (preAccounts == undefined || postAccounts == undefined) return null;

  const preAccount = filterAccount(preAccounts, token);
  const postAccount = filterAccount(postAccounts, token);
  // if (!preAccount && !postAccount) return null;

  const preBalance = preAccount ? preAccount.uiTokenAmount?.uiAmount : 0;
  const postBalance = postAccount ? postAccount.uiTokenAmount?.uiAmount : 0;

  return postBalance - preBalance;
};

const getSolBalanceChange = (data: SubscribeUpdate): number => {
  const preAccounts = data.transaction?.transaction?.meta?.preTokenBalances;
  const postAccounts = data.transaction?.transaction?.meta?.postTokenBalances;
  if (preAccounts == undefined || postAccounts == undefined) return 0;

  const preAccount = filterSolAccount(preAccounts);
  const postAccount = filterSolAccount(postAccounts);
  // if (!preAccount && !postAccount) return null;

  const preBalance = preAccount ? preAccount.uiTokenAmount?.uiAmount : 0;
  const postBalance = postAccount ? postAccount.uiTokenAmount?.uiAmount : 0;

  return postBalance - preBalance;
};

// Get Token mint
const getMintAccount = (data: SubscribeUpdate): string | null => {
  const preAccounts = data.transaction?.transaction?.meta?.preTokenBalances;
  if (preAccounts == undefined) return null;
  const preAccount = filterAccount(preAccounts, "");
  if (preAccount) return preAccount.mint;
  else return null;
};

const getTokenDecimals = (data: SubscribeUpdate): number | null => {
  const preAccounts = data.transaction?.transaction?.meta?.preTokenBalances;
  if (preAccounts == undefined) return null;
  const preAccount = filterAccount(preAccounts, "");
  if (preAccount) return preAccount.uiTokenAmount.decimals;
  else return null;
};

function isSubscribeUpdateTransaction(
  data: SubscribeUpdate
): data is SubscribeUpdate & { transaction: SubscribeUpdateTransaction } {
  return (
    "transaction" in data &&
    typeof data.transaction === "object" &&
    data.transaction !== null &&
    "slot" in data.transaction &&
    "transaction" in data.transaction
  );
}

function convertSignature(signature: Uint8Array): { base58: string } {
  return { base58: bs58.encode(Buffer.from(signature)) };
}

main().catch((err) => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});

// bot.js - revised for continuous operation
export const bot = {
  running: false,
  shouldStop: false,

  start: function () {
    if (this.running) return false;

    this.running = true;
    this.shouldStop = false;

    // Start the continuous process
    this.runContinuously();
    console.log("Bot started running continuously");
    return true;
  },

  runContinuously: async function () {
    while (!this.shouldStop) {
      try {
        // Your main bot logic here
        await this.performBotOperation();

        // Optional: Add a small delay to prevent CPU hogging
        // Remove if your operations already have built-in waits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Error in bot operation:", error);
        // Optional: Add error handling logic here
        // Maybe wait before retrying if there was an error
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.running = false;
    console.log("Bot stopped running");
  },

  performBotOperation: async function () {
    // Example bot operation
    // Replace with your actual bot logic
    console.log("Bot is performing operations...");

    // Simulate some work
    await someAsyncTask();

    // Your continuous bot logic goes here
    // This could be monitoring blockchain events, processing data, etc.
  },

  stop: function () {
    if (!this.running) return false;

    console.log("Bot stopping - finishing current operation...");
    this.shouldStop = true;
    return true;
  },

  setting: function (settings: SettingProps) {
    const { privateKey, copyAmount, maxTradeSize, targetWallet, priorityFee } =
      settings;
  },
};

// Example async task for demonstration
async function someAsyncTask() {
  // Your actual async operations
  return new Promise((resolve) => {
    // Simulating some work
    setTimeout(resolve, 500);
  });
}

module.exports = bot;
