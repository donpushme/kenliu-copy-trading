// src/models/trade.ts
import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

// Interface for Trade document
export interface ITrade extends Document {
  publicKey: string;
  balance: number;
  amount: number;
  token: string;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the schema
const TradeSchema: Schema = new Schema(
  {
    publicKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    signature: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create and export the model
const Trade = mongoose.model<ITrade>("Trade", TradeSchema);
export default Trade;
