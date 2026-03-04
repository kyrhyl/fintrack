import { model, models, Schema, type InferSchemaType } from "mongoose";

const recurringExpenseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    recurrenceRule: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    nextDueDate: { type: Date, required: true },
    autoCreateTransaction: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

recurringExpenseSchema.index({ isActive: 1, nextDueDate: 1 });
recurringExpenseSchema.index({ nextDueDate: 1 });
recurringExpenseSchema.index({ category: 1, isActive: 1 });

export type RecurringExpenseDocument = InferSchemaType<typeof recurringExpenseSchema>;

export const RecurringExpense =
  models.RecurringExpense || model("RecurringExpense", recurringExpenseSchema);
