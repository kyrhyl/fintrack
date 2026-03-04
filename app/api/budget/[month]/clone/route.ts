import { fail, ok } from "@/lib/api";
import { isValidMonthKey, previousMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { BudgetPlan } from "@/models/BudgetPlan";

type RouteContext = {
  params: Promise<{ month: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { month } = await context.params;

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  await connectToDatabase();

  const existing = await BudgetPlan.findOne({ month }).lean();
  if (existing) {
    return fail("CONFLICT", "Budget plan already exists for this month.", 409);
  }

  const sourceMonth = previousMonthKey(month);
  const source = await BudgetPlan.findOne({ month: sourceMonth }).lean();

  if (!source) {
    return fail("NOT_FOUND", "No previous month budget plan found to clone.", 404);
  }

  const created = await BudgetPlan.create({
    month,
    plannedIncome: source.plannedIncome,
    allocationStrategy: source.allocationStrategy,
    carryOverEnabled: source.carryOverEnabled,
    status: "draft",
    categories: source.categories,
  });

  return ok(created.toObject(), 201);
}
