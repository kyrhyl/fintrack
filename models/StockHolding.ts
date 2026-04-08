import { model, models, Schema, type InferSchemaType } from "mongoose";

const stockHoldingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true, uppercase: true },
    exchange: { type: String, default: "PSE", trim: true, uppercase: true },
    shares: { type: Number, required: true, min: 0 },
    averageCost: { type: Number, default: 0, min: 0 },
    lastPrice: { type: Number, default: 0, min: 0 },
    lastPriceAt: { type: Date },
    priceSource: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

stockHoldingSchema.index({ symbol: 1, exchange: 1, isActive: 1 });
stockHoldingSchema.index({ isActive: 1, updatedAt: -1 });

export type StockHoldingDocument = InferSchemaType<typeof stockHoldingSchema>;

export const StockHolding =
  models.StockHolding || model("StockHolding", stockHoldingSchema, "stock_holdings");
