import { model, models, Schema, type InferSchemaType } from "mongoose";

const budgetCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["fixed", "variable", "percentage"],
      required: true,
    },
    plannedAmount: { type: Number, min: 0, default: 0 },
    percentage: { type: Number, min: 0, max: 100, default: 0 },
    recurrence: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
    },
  },
  { _id: false },
);

const budgetPlanSchema = new Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    plannedIncome: { type: Number, required: true, min: 0 },
    allocationStrategy: {
      type: String,
      enum: ["fixed", "variable", "percentage"],
      default: "fixed",
    },
    carryOverEnabled: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "locked"], default: "draft" },
    categories: { type: [budgetCategorySchema], default: [] },
  },
  {
    timestamps: true,
  },
);

budgetPlanSchema.index({ month: 1 }, { unique: true });
budgetPlanSchema.index({ status: 1, month: -1 });

export type BudgetPlanDocument = InferSchemaType<typeof budgetPlanSchema>;

export const BudgetPlan = models.BudgetPlan || model("BudgetPlan", budgetPlanSchema);
