import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { isValidMonthKey, previousMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import {
  applyAllocationStrategy,
  calculateAllocationBalance,
  computeCarryOverByCategory,
  computeBudgetActuals,
  roundMoney,
} from "@/lib/services/budget";
import { budgetPlanUpsertSchema } from "@/lib/validation";
import { BudgetPlan } from "@/models/BudgetPlan";
import { Transaction } from "@/models/Transaction";

type RouteContext = {
  params: Promise<{ month: string }>;
};

type PlanCategory = {
  name: string;
  type: "fixed" | "variable" | "percentage";
  plannedAmount: number;
  percentage: number;
  recurrence: "monthly" | "quarterly" | "yearly";
};

type BudgetPlanView = {
  month: string;
  plannedIncome: number;
  carryOverEnabled?: boolean;
  categories: PlanCategory[];
};

function applyCarryOverToCategories(categories: PlanCategory[], carryOverByCategory: Record<string, number>) {
  const categoryMap = new Map(categories.map((category) => [category.name, { ...category }]));

  for (const [name, carryOverAmount] of Object.entries(carryOverByCategory)) {
    const existing = categoryMap.get(name);

    if (existing) {
      existing.plannedAmount = roundMoney((existing.plannedAmount || 0) + carryOverAmount);
      categoryMap.set(name, existing);
      continue;
    }

    categoryMap.set(name, {
      name,
      type: "fixed",
      plannedAmount: roundMoney(carryOverAmount),
      percentage: 0,
      recurrence: "monthly",
    });
  }

  return Array.from(categoryMap.values());
}

function monthDateRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

async function actualByCategory(month: string) {
  const { start, end } = monthDateRange(month);
  const aggregation = await Transaction.aggregate<{
    _id: string;
    total: number;
  }>([
    {
      $match: {
        kind: "expense",
        transactionDate: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
  ]);

  return aggregation.reduce<Record<string, number>>((acc, entry) => {
    acc[entry._id] = roundMoney(entry.total);
    return acc;
  }, {});
}

export async function GET(_: Request, context: RouteContext) {
  const { month } = await context.params;

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  await connectToDatabase();
  const plan = await BudgetPlan.findOne({ month }).lean<BudgetPlanView | null>();

  if (!plan) {
    return ok({ month, plan: null });
  }

  const actualsMap = await actualByCategory(month);
  const categories = plan.categories || [];
  const actuals = computeBudgetActuals(categories, actualsMap);
  const plannedTotal = roundMoney(
    categories.reduce((sum: number, category: PlanCategory) => sum + (category.plannedAmount || 0), 0),
  );

  return ok({
    month,
    plan,
    summary: {
      plannedTotal,
      actualTotal: roundMoney(actuals.reduce((sum, item) => sum + item.actualAmount, 0)),
      allocationBalance: calculateAllocationBalance(plan.plannedIncome, plannedTotal),
    },
    actuals,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { month } = await context.params;

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  try {
    const payload = budgetPlanUpsertSchema.parse(await request.json());

    await connectToDatabase();
    const existingPlan = await BudgetPlan.findOne({ month }).lean<BudgetPlanView | null>();

    const allocation = applyAllocationStrategy(
      payload.categories,
      payload.allocationStrategy,
      payload.plannedIncome,
    );

    if (!allocation.success) {
      return fail("VALIDATION_ERROR", allocation.message, 422);
    }

    let categories = allocation.categories;
    let carryOverAppliedTotal = 0;
    let carryOverSourceMonth: string | null = null;

    if (payload.carryOverEnabled && !existingPlan) {
      carryOverSourceMonth = previousMonthKey(month);

      const sourcePlan = await BudgetPlan.findOne({ month: carryOverSourceMonth }).lean<BudgetPlanView | null>();

      if (sourcePlan) {
        const sourceActualByCategory = await actualByCategory(carryOverSourceMonth);
        const carryOverByCategory = computeCarryOverByCategory(
          sourcePlan.categories || [],
          sourceActualByCategory,
        );

        categories = applyCarryOverToCategories(categories, carryOverByCategory);
        carryOverAppliedTotal = roundMoney(
          Object.values(carryOverByCategory).reduce((sum, amount) => sum + amount, 0),
        );
      }
    }

    const updated = await BudgetPlan.findOneAndUpdate(
      { month },
      {
        ...payload,
        month,
        categories,
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();

    return ok(
      {
        plan: updated,
        carryOver: {
          applied: carryOverAppliedTotal > 0,
          sourceMonth: carryOverSourceMonth,
          amount: carryOverAppliedTotal,
        },
      },
      existingPlan ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to save budget plan.", 500);
  }
}
