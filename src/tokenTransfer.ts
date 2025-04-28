import bs58 from 'bs58';
import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createTransferInstruction } from "@solana/spl-token";
import { getKeypairFromEnvironment } from '@solana-developers/helpers'
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const tokenTransfer = async (
    receiver: string,
    tokenMint: string,
    amount: number,
) => {
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=ffff5f0b-b41e-4d08-a85b-56780908eb62", "confirmed")
    const sender: Keypair = getKeypairFromEnvironment("SECRET_KEY");
    const transaction = new Transaction();
    if (amount <= 0) return;
    const onCurve = PublicKey.isOnCurve(receiver);
    if (!onCurve) return;

    let senderATA = getAssociatedTokenAddressSync(new PublicKey(tokenMint), sender.publicKey);
    let receiverATA = getAssociatedTokenAddressSync(new PublicKey(tokenMint), new PublicKey(receiver));
    let receiverATAInfo = await connection.getAccountInfo(receiverATA);

    if (!receiverATAInfo) {
        const createATAInstruction = createAssociatedTokenAccountInstruction(
            sender.publicKey,
            receiverATA,
            new PublicKey(receiver),
            new PublicKey(tokenMint),
        );
        transaction.add(createATAInstruction);
    }

    transaction.add(
        createTransferInstruction(
            senderATA,
            receiverATA,
            sender.publicKey,
            amount * LAMPORTS_PER_SOL
        )
    );
    try {
        const simulation = await connection.simulateTransaction(transaction, [sender]);

        console.log({ simulation })

        const signature = await sendAndConfirmTransaction(connection, transaction, [
            sender,
        ]);
        return signature;
    } catch (error) {
        console.log(error);
        return null;
    }
};