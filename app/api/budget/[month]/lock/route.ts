import { fail, ok } from "@/lib/api";
import { isValidMonthKey } from "@/lib/month";
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

  const plan = await BudgetPlan.findOneAndUpdate(
    { month },
    { status: "locked" },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!plan) {
    return fail("NOT_FOUND", "Budget plan not found.", 404);
  }

  return ok(plan);
}
