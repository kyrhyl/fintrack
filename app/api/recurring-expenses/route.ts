import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { recurringExpenseCreateSchema } from "@/lib/validation";
import { RecurringExpense } from "@/models/RecurringExpense";

export async function GET() {
  await connectToDatabase();
  const items = await RecurringExpense.find().sort({ nextDueDate: 1 }).lean();
  return ok({ items, total: items.length });
}

export async function POST(request: Request) {
  try {
    const payload = recurringExpenseCreateSchema.parse(await request.json());

    await connectToDatabase();
    const created = await RecurringExpense.create(payload);

    return ok(created.toObject(), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to create recurring expense.", 500);
  }
}
