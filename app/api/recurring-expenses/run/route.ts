import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { generateRecurringExpenses } from "@/lib/services/generate-recurring";

export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const result = await generateRecurringExpenses();
    return ok({
      message: "Recurring expenses processed",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate recurring expenses.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
