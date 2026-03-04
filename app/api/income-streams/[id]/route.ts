import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { incomeStreamUpdateSchema } from "@/lib/validation";
import { IncomeStream } from "@/models/IncomeStream";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid income stream id.", 400);
  }

  try {
    const payload = incomeStreamUpdateSchema.parse(await request.json());

    await connectToDatabase();
    const updated = await IncomeStream.findByIdAndUpdate(id, payload, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    if (!updated) {
      return fail("NOT_FOUND", "Income stream not found.", 404);
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    const message = error instanceof Error ? error.message : "Unable to update income stream.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const permanent = url.searchParams.get("permanent") === "true";

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid income stream id.", 400);
  }

  await connectToDatabase();

  if (permanent) {
    const deleted = await IncomeStream.findByIdAndDelete(id).lean();

    if (!deleted) {
      return fail("NOT_FOUND", "Income stream not found.", 404);
    }

    return ok({ id, deleted: true });
  }

  const archived = await IncomeStream.findByIdAndUpdate(
    id,
    { isActive: false },
    { returnDocument: "after", runValidators: true },
  ).lean();

  if (!archived) {
    return fail("NOT_FOUND", "Income stream not found.", 404);
  }

  return ok({ id, archived: true });
}
