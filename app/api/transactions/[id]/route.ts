import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { transactionCreateSchema } from "@/lib/validation";
import { Transaction } from "@/models/Transaction";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid transaction id.", 400);
  }

  try {
    const payload = transactionCreateSchema.partial().parse(await request.json());

    await connectToDatabase();
    const updated = await Transaction.findByIdAndUpdate(id, payload, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    if (!updated) {
      return fail("NOT_FOUND", "Transaction not found.", 404);
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to update transaction.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid transaction id.", 400);
  }

  await connectToDatabase();
  const deleted = await Transaction.findByIdAndDelete(id).lean();

  if (!deleted) {
    return fail("NOT_FOUND", "Transaction not found.", 404);
  }

  return ok({ id, deleted: true });
}
