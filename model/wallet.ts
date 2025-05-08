// src/models/Wallet.ts
import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Interface for Wallet document
export interface IWallet extends Document {
  publicKey: string;
  privateKey: string; // Will be stored encrypted
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const WalletSchema: Schema = new Schema({
  publicKey: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  privateKey: {
    type: String, // Stores encrypted private key
    required: true
  }
}, {
  timestamps: true
});


// Create and export the model
const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
export default Wallet;