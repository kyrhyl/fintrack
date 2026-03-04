import { z } from "zod";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const monthSchema = z.string().regex(monthPattern, "Invalid month key.");

export const transactionCreateSchema = z.object({
  title: z.string().trim().min(1),
  kind: z.enum(["income", "expense"]),
  category: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  transactionDate: z.coerce.date(),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const budgetCategorySchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["fixed", "variable", "percentage"]),
  plannedAmount: z.number().nonnegative().default(0),
  percentage: z.number().min(0).max(100).default(0),
  recurrence: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
});

export const budgetPlanUpsertSchema = z.object({
  plannedIncome: z.number().nonnegative(),
  allocationStrategy: z.enum(["fixed", "variable", "percentage"]).default("fixed"),
  carryOverEnabled: z.boolean().default(false),
  status: z.enum(["draft", "locked"]).default("draft"),
  categories: z.array(budgetCategorySchema).default([]),
});

export const recurringExpenseCreateSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  category: z.string().trim().min(1),
  recurrenceRule: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  nextDueDate: z.coerce.date(),
  autoCreateTransaction: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const recurringExpenseUpdateSchema = recurringExpenseCreateSchema.partial();

const liabilityStatusSchema = z.enum(["newly opened", "on track", "halfway there", "closed"]);
const liabilityActiveStatusSchema = z.enum(["newly opened", "on track", "halfway there"]);

const liabilityBaseSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(["loan", "credit_card", "mortgage", "other"]).default("loan"),
  dateIncurred: z.coerce.date(),
  monthlyAmortization: z.number().positive(),
  termMonths: z.number().int().positive(),
  principal: z.number().nonnegative().optional(),
  outstandingBalance: z.number().nonnegative().optional(),
  monthlyPayment: z.number().nonnegative().optional(),
  interestRatePercent: z.number().nonnegative().default(0),
  startDate: z.coerce.date().optional(),
  status: liabilityStatusSchema.default("on track"),
  lastActiveStatus: liabilityActiveStatusSchema.optional(),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().default(""),
  paymentHistory: z
    .array(
      z.object({
        monthKey: monthSchema,
        paid: z.boolean().default(false),
        paidAt: z.coerce.date().optional(),
      }),
    )
    .optional(),
});

export const liabilityCreateSchema = liabilityBaseSchema
  .superRefine((value, ctx) => {
    if (value.termMonths <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["termMonths"],
        message: "Total monthly period must be greater than zero.",
      });
    }
  });

export const liabilityUpdateSchema = liabilityBaseSchema.partial().superRefine((value, ctx) => {
  if (typeof value.termMonths === "number" && value.termMonths <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["termMonths"],
      message: "Total monthly period must be greater than zero.",
    });
  }
});

export const liabilityPaymentToggleSchema = z.object({
  paid: z.boolean(),
});

const assetTypeSchema = z.enum([
  "cash",
  "bank_account",
  "time_deposit",
  "money_market",
  "stock",
  "etf",
  "fund",
  "bond",
  "reit",
  "retirement",
  "cooperative",
  "mp2",
  "real_estate",
  "vehicle",
  "business_equity",
  "receivable",
  "crypto",
  "precious_metal",
  "collectible",
  "other",
]);

const assetBaseSchema = z.object({
  name: z.string().trim().min(1),
  type: assetTypeSchema.default("other"),
  currentValue: z.number().nonnegative(),
  annualYieldPercent: z.number().nonnegative().default(0),
  monthlyIncome: z.number().nonnegative().optional(),
  institution: z.string().trim().max(200).optional().default(""),
  isLiquid: z.boolean().default(false),
  isActive: z.boolean().optional(),
  acquiredAt: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const assetCreateSchema = assetBaseSchema;

export const assetUpdateSchema = assetBaseSchema.partial();

export const investmentCreateSchema = assetCreateSchema;

export const investmentUpdateSchema = assetUpdateSchema;

const salaryEarningSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  isTaxable: z.boolean().default(true),
});

const salaryDeductionSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  category: z.enum(["tax", "government", "medical", "loan", "savings", "other"]).default("other"),
  liabilityId: z.string().trim().optional(),
  applied: z.boolean().optional(),
  appliedAt: z.coerce.date().optional(),
  reconcileNote: z.string().trim().max(1000).optional(),
});

export const salaryUpsertSchema = z.object({
  month: monthSchema,
  grossPay: z.number().nonnegative(),
  netPay: z.number().nonnegative(),
  takeHomeRatio: z.number().min(0).max(100).optional(),
  earnings: z.array(salaryEarningSchema).default([]),
  deductions: z.array(salaryDeductionSchema).default([]),
  loanDeductions: z.array(salaryDeductionSchema).default([]),
  notes: z.string().trim().max(1000).optional().default(""),
});

const incomeStreamBaseSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["active", "passive"]).default("active"),
  monthlyAmount: z.number().nonnegative(),
  startMonth: monthSchema,
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(1000).optional().default(""),
});

export const incomeStreamCreateSchema = incomeStreamBaseSchema;
export const incomeStreamUpdateSchema = incomeStreamBaseSchema.partial();
