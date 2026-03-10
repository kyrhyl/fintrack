import { model, models, Schema, type InferSchemaType } from "mongoose";

const netWorthSnapshotSchema = new Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    captureDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
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

netWorthSnapshotSchema.index({ month: 1 });
netWorthSnapshotSchema.index({ captureDate: 1 }, { unique: true, sparse: true });
netWorthSnapshotSchema.index({ capturedAt: -1 });

export type NetWorthSnapshotDocument = InferSchemaType<typeof netWorthSnapshotSchema>;

const existingModel = models.NetWorthSnapshot as { schema?: { path?: (name: string) => unknown } } | undefined;

if (existingModel?.schema?.path && !existingModel.schema.path("captureDate")) {
  delete models.NetWorthSnapshot;
}

export const NetWorthSnapshot =
  models.NetWorthSnapshot || model("NetWorthSnapshot", netWorthSnapshotSchema);
