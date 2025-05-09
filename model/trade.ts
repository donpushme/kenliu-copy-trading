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

export interface TradeModel extends mongoose.Model<ITrade> {
  findByPublicKey(publicKey: string): Promise<ITrade[]>;
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

TradeSchema.statics.findByPublicKey = function (publicKey: string) {
  return this.find({ publicKey });
};

const Trade = mongoose.model<ITrade, TradeModel>("Trade", TradeSchema);
export default Trade;
