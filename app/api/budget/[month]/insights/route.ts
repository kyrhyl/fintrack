import { fail, ok } from "@/lib/api";
import { isValidMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { computeBudgetActuals, computeBudgetInsights } from "@/lib/services/budget";
import { BudgetPlan } from "@/models/BudgetPlan";
import { Transaction } from "@/models/Transaction";

type RouteContext = {
  params: Promise<{ month: string }>;
};

type PlanCategory = {
  name: string;
  plannedAmount: number;
};

type BudgetPlanView = {
  month: string;
  categories: PlanCategory[];
};

function monthDateRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function GET(_: Request, context: RouteContext) {
  const { month } = await context.params;

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  await connectToDatabase();
  const plan = await BudgetPlan.findOne({ month }).lean<BudgetPlanView | null>();

  if (!plan) {
    return fail("NOT_FOUND", "Budget plan not found.", 404);
  }

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

  const actualByCategory = aggregation.reduce<Record<string, number>>((acc, item) => {
    acc[item._id] = item.total;
    return acc;
  }, {});

  const actuals = computeBudgetActuals(plan.categories || [], actualByCategory);
  const insights = computeBudgetInsights(actuals);

  return ok({ month, insights, actuals });
}
