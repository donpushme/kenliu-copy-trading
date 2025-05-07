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
import { getSettings, saveSettings } from "./utils/commonFunc";
import WebSocket from "ws";

dotenv.config();

// Constants
const GRPC_ENDPOINT = process.env.GRPC_ENDPOINT!;
const COMMITMENT = CommitmentLevel.PROCESSED;
const BASE_MINT_ADDRESS = process.env.BASE_MINT_ADDRESS;
const BUY_AMOUNT = Number(process.env.BUY_AMOUNT) || 0.001;

const solanaConnection = new Connection(process.env.RPC_ENDPOINT!, "confirmed");
const keyPair = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

const TARGET_ADDRESS = process.env.TARGET_ADDRESS!;
const IS_JITO = process.env.IS_JITO!;

if (!TARGET_ADDRESS) console.log("Target Address is not defined");

function sendRequest(ws: WebSocket, account: string) {
  const request = {
    jsonrpc: "2.0",
    id: 420,
    method: "transactionSubscribe",
    params: [
      {
        accountInclude: [account],
      },
      {
        commitment: "processed",
        encoding: "jsonParsed",
        transactionDetails: "full",
        showRewards: true,
        maxSupportedTransactionVersion: 0,
      },
    ],
  };
  ws.send(JSON.stringify(request));
}

async function handleData(data: any) {
  try {
    const result = data.params?.result;
    const transaction = data.params?.result?.transaction.transaction;
    const message = transaction?.message;

    if (!transaction || !message) {
      return;
    }

    const tokenAmount = getBalanceChange(result, "");

    console.log({ tokenAmount });

    if (tokenAmount) {
      const isBuy: boolean = tokenAmount > 0;

      const mint = getMintAccount(result);

      console.log({mint})

      if (!mint) return;

      // if (mint == NATIVE_MINT.toBase58()) return;

      // console.log(transaction)
      // const formattedSignature = convertSignature(transaction.signature);
      console.log(
        "========================================= Target Wallet ======================================="
      );
      console.log(
        `${isBuy ? "Buy" : "Sell"} => https://solscan.io/tx/${
          transaction.signatures[0]
        }`
      );
      console.log(
        "=============================================================================================== \n"
      );
      if (isBuy) {
        // const amount = BUY_AMOUNT;
        const solBalanceChange = getSolBalanceChange(result);
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
  data: any,
  token: string
): number | null => {
  const preAccounts = data.transaction?.meta?.preTokenBalances;
  const postAccounts = data.transaction?.meta?.postTokenBalances;

  if (preAccounts == undefined || postAccounts == undefined) return null;
  
  const preAccount = filterAccount(preAccounts, token);
  const postAccount = filterAccount(postAccounts, token);
  // if (!preAccount && !postAccount) return null;

  const preBalance = preAccount ? preAccount.uiTokenAmount?.uiAmount : 0;
  const postBalance = postAccount ? postAccount.uiTokenAmount?.uiAmount : 0;

  return postBalance - preBalance;
};

const getSolBalanceChange = (data: any): number => {
  const preAccounts = data.transaction?.meta?.preTokenBalances;
  const postAccounts = data.transaction?.meta?.postTokenBalances;
  if (preAccounts == undefined || postAccounts == undefined) return 0;

  const preAccount = filterSolAccount(preAccounts);
  const postAccount = filterSolAccount(postAccounts);
  // if (!preAccount && !postAccount) return null;

  const preBalance = preAccount ? preAccount.uiTokenAmount?.uiAmount : 0;
  const postBalance = postAccount ? postAccount.uiTokenAmount?.uiAmount : 0;

  return postBalance - preBalance;
};

// Get Token mint
const getMintAccount = (data: any): string | null => {
  const preAccounts = data.transaction?.meta?.preTokenBalances;
  if (preAccounts == undefined) return null;
  const preAccount = filterAccount(preAccounts, "");
  if (preAccount) return preAccount.mint;
  else return null;
};

const getTokenDecimals = (data: any): number | null => {
  const preAccounts = data.transaction?.meta?.preTokenBalances;
  if (preAccounts == undefined) return null;
  const preAccount = filterAccount(preAccounts, "");
  if (preAccount) return preAccount.uiTokenAmount.decimals;
  else return null;
};

function convertSignature(signature: Uint8Array): { base58: string } {
  return { base58: bs58.encode(Buffer.from(signature)) };
}

class BotManager {
  running: boolean;
  settings: Object;
  ws: WebSocket | null = null;

  constructor() {
    this.running = false;
    this.settings = {};
  }

  async initialize() {
    this.settings = getSettings();
    console.log("Bot initialized with settings:", this.settings);
  }

  async start() {
    if (this.running) {
      return { success: false, message: "Bot is already running" };
    }

    try {
      this.running = true;
      console.log("Bot starting operation...");

      // Execute the operation directly
      await this.performBotOperation();

      return { success: true, message: "Bot operation completed successfully" };
    } catch (error) {
      console.error("Error during bot operation:", error);
      return {
        success: false,
        message: `Bot operation failed`,
      };
    }
  }

  async performBotOperation() {
    console.log("Bot performing operations...");

    // Get current settings
    this.ws = new WebSocket(GRPC_ENDPOINT);
    const settings = getSettings();

    // Execute main operation
    try {
      this.ws.on("open", function open() {
        console.log("WebSocket is open");
        sendRequest(this, settings.targetWallet); // Send a request once the WebSocket is open
      });

      this.ws.on("message", function incoming(data) {
        const messageStr = data.toString("utf8");
        try {
          const messageObj = JSON.parse(messageStr);
          handleData(messageObj);
        } catch (e) {
          console.error("Failed to parse JSON:", e);
        }
      });

      this.ws.on("error", function error(err) {
        console.error("WebSocket error:", err);
      });

      this.ws.on("close", function close() {
        console.log("WebSocket is closed");
      });
    } catch (err) {
      console.error("Error in main operation:", err);
      throw err; // Re-throw to be handled by the start method
    }

    // Additional operations can be added here
  }

  async stop() {
    if (!this.running) {
      return { success: false, message: "Bot is not running" };
    }

    if (this.ws) this.ws.close();

    return {
      success: true,
      message: "Bot marked for stopping, current operation will complete",
    };
  }

  async updateSettings(settings: any) {
    try {
      console.log(settings);
      const {
        privateKey,
        copyAmount,
        maxTradeSize,
        targetWallet,
        priorityFee,
      } = settings;

      if (privateKey) saveSettings("privateKey", privateKey);
      if (copyAmount) saveSettings("copyAmount", copyAmount);
      if (maxTradeSize) saveSettings("maxTradeSize", maxTradeSize);
      if (targetWallet) saveSettings("targetWallet", targetWallet);
      if (priorityFee) saveSettings("priorityFee", priorityFee);

      // Refresh settings
      this.settings = getSettings();

      return { success: true, message: "Settings updated successfully" };
    } catch (error) {
      console.error("Failed to update settings:", error);
      return {
        success: false,
        message: `Failed to update settings`,
      };
    }
  }
}

// Singleton instance
export const bot = new BotManager();
