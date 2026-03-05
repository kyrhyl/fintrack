import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { transactionCreateSchema } from "@/lib/validation";
import { Transaction } from "@/models/Transaction";

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");
  const kindParam = url.searchParams.get("kind");

  const query: Record<string, unknown> = {};
  if (startParam || endParam) {
    const startDate = startParam ? new Date(startParam) : null;
    const endDate = endParam ? new Date(endParam) : null;
    query.transactionDate = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDate ? { $lte: endDate } : {}),
    };
  }
  if (kindParam) {
    query.kind = kindParam;
  }

  await connectToDatabase();

  const items = await Transaction.find(query).sort({ transactionDate: -1 }).lean();
  return ok({ items, total: items.length });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = transactionCreateSchema.parse(await request.json());

    await connectToDatabase();
    const created = await Transaction.create(payload);

    return ok(created.toObject(), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to create transaction.", 500);
  }
}
