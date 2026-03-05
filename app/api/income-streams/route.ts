import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { incomeStreamCreateSchema } from "@/lib/validation";
import { IncomeStream } from "@/models/IncomeStream";

function parseBoolean(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const includeArchived = parseBoolean(url.searchParams.get("includeArchived")) || false;
  const type = (url.searchParams.get("type") || "").trim();

  const filter: Record<string, unknown> = {};
  if (!includeArchived) {
    filter.isActive = true;
  }
  if (type === "active" || type === "passive") {
    filter.type = type;
  }

  await connectToDatabase();
  const items = await IncomeStream.find(filter).sort({ type: 1, monthlyAmount: -1, createdAt: -1 }).lean();

  return ok({ items, total: items.length });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = incomeStreamCreateSchema.parse(await request.json());

    await connectToDatabase();
    const created = await IncomeStream.create(payload);

    return ok(created.toObject(), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    const message = error instanceof Error ? error.message : "Unable to create income stream.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
