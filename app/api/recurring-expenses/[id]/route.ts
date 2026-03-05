import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { recurringExpenseUpdateSchema } from "@/lib/validation";
import { RecurringExpense } from "@/models/RecurringExpense";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid recurring expense id.", 400);
  }

  try {
    const payload = recurringExpenseUpdateSchema.parse(await request.json());

    await connectToDatabase();
    const updated = await RecurringExpense.findByIdAndUpdate(id, payload, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    if (!updated) {
      return fail("NOT_FOUND", "Recurring expense not found.", 404);
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to update recurring expense.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid recurring expense id.", 400);
  }

  await connectToDatabase();
  const deleted = await RecurringExpense.findByIdAndDelete(id).lean();

  if (!deleted) {
    return fail("NOT_FOUND", "Recurring expense not found.", 404);
  }

  return ok({ id, deleted: true });
}
