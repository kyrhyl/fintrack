import { model, models, Schema, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    transactionDate: { type: Date, required: true },
    notes: { type: String, default: "", trim: true },
    recurringExpenseId: { type: Schema.Types.ObjectId, ref: "RecurringExpense", default: null },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ transactionDate: -1 });
transactionSchema.index({ kind: 1, transactionDate: -1 });
transactionSchema.index({ kind: 1, transactionDate: -1, category: 1 });
transactionSchema.index({ category: 1, transactionDate: -1 });

export type TransactionDocument = InferSchemaType<typeof transactionSchema>;

export const Transaction =
  models.Transaction || model("Transaction", transactionSchema);
