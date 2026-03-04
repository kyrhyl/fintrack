import { model, models, Schema, type InferSchemaType } from "mongoose";

const netWorthSnapshotSchema = new Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    netWorth: { type: Number, required: true },
    assetsTotal: { type: Number, required: true, min: 0 },
    liabilitiesTotal: { type: Number, required: true, min: 0 },
    capturedAt: { type: Date, required: true },
    sourceUpdatedAt: { type: Date, required: true },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

netWorthSnapshotSchema.index({ month: 1 }, { unique: true });
netWorthSnapshotSchema.index({ capturedAt: -1 });

export type NetWorthSnapshotDocument = InferSchemaType<typeof netWorthSnapshotSchema>;

export const NetWorthSnapshot =
  models.NetWorthSnapshot || model("NetWorthSnapshot", netWorthSnapshotSchema);
