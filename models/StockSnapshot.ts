import { model, models, Schema, type InferSchemaType } from "mongoose";

const stockSnapshotSchema = new Schema(
  {
    month: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    exchange: { type: String, default: "PSE", trim: true, uppercase: true },
    closePrice: { type: Number, required: true, min: 0 },
    shares: { type: Number, required: true, min: 0 },
    marketValue: { type: Number, required: true, min: 0 },
    costBasis: { type: Number, required: true, min: 0 },
    unrealizedPnL: { type: Number, required: true },
    capturedAt: { type: Date, required: true },
    source: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  },
);

stockSnapshotSchema.index({ month: -1, symbol: 1 }, { unique: true });
stockSnapshotSchema.index({ capturedAt: -1 });

export type StockSnapshotDocument = InferSchemaType<typeof stockSnapshotSchema>;

export const StockSnapshot =
  models.StockSnapshot || model("StockSnapshot", stockSnapshotSchema, "stock_snapshots");
