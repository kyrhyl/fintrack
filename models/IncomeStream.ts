import { model, models, Schema, type InferSchemaType } from "mongoose";

const incomeStreamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["active", "passive"], default: "active" },
    monthlyAmount: { type: Number, required: true, min: 0 },
    startMonth: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

incomeStreamSchema.index({ isActive: 1, type: 1 });
incomeStreamSchema.index({ startMonth: 1 });
incomeStreamSchema.index({ name: 1, startMonth: 1 });

export type IncomeStreamDocument = InferSchemaType<typeof incomeStreamSchema>;

export const IncomeStream = models.IncomeStream || model("IncomeStream", incomeStreamSchema);
