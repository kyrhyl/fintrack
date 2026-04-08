import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { syncStockAggregateFromHoldings } from "@/lib/services/stocks/aggregate-asset";
import { normalizeStockSymbol } from "@/lib/services/stocks/symbol";
import { stockHoldingCreateSchema } from "@/lib/validation";
import { StockHolding } from "@/models/StockHolding";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  await connectToDatabase();
  const items = await StockHolding.find({ isActive: true }).sort({ symbol: 1 }).lean();
  return ok({ items, total: items.length });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = stockHoldingCreateSchema.parse(await request.json());

    await connectToDatabase();
    const created = await StockHolding.create({
      ...payload,
      symbol: normalizeStockSymbol(payload.symbol),
      exchange: (payload.exchange || "PSE").trim().toUpperCase(),
      isActive: payload.isActive ?? true,
    });

    await syncStockAggregateFromHoldings();

    return ok(created.toObject(), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to create stock holding.", 500);
  }
}
