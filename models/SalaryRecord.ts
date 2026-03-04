import { model, models, Schema, type InferSchemaType } from "mongoose";

const deductionItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["tax", "government", "medical", "loan", "savings", "other"],
      default: "other",
    },
    liabilityId: { type: String, trim: true, default: "" },
    applied: { type: Boolean, default: false },
    appliedAt: { type: Date },
    reconcileNote: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const earningItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    isTaxable: { type: Boolean, default: true },
  },
  { _id: false },
);

const salaryRecordSchema = new Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    grossPay: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    earnings: { type: [earningItemSchema], default: [] },
    deductions: { type: [deductionItemSchema], default: [] },
    loanDeductions: { type: [deductionItemSchema], default: [] },
    takeHomeRatio: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

salaryRecordSchema.index({ month: 1 }, { unique: true });
salaryRecordSchema.index({ createdAt: -1 });

export type SalaryRecordDocument = InferSchemaType<typeof salaryRecordSchema>;

export const SalaryRecord = models.SalaryRecord || model("SalaryRecord", salaryRecordSchema);
