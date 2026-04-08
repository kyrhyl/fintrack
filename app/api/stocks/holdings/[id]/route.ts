import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { syncStockAggregateFromHoldings } from "@/lib/services/stocks/aggregate-asset";
import { normalizeStockSymbol } from "@/lib/services/stocks/symbol";
import { stockHoldingUpdateSchema } from "@/lib/validation";
import { StockHolding } from "@/models/StockHolding";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid stock holding id.", 400);
  }

  try {
    const payload = stockHoldingUpdateSchema.parse(await request.json());

    await connectToDatabase();
    const updatePayload = {
      ...payload,
      ...(payload.symbol ? { symbol: normalizeStockSymbol(payload.symbol) } : {}),
      ...(payload.exchange ? { exchange: payload.exchange.trim().toUpperCase() } : {}),
    };
    const updated = await StockHolding.findByIdAndUpdate(id, updatePayload, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    if (!updated) {
      return fail("NOT_FOUND", "Stock holding not found.", 404);
    }

    await syncStockAggregateFromHoldings();

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to update stock holding.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid stock holding id.", 400);
  }

  await connectToDatabase();
  const deleted = await StockHolding.findByIdAndDelete(id).lean();
  if (!deleted) {
    return fail("NOT_FOUND", "Stock holding not found.", 404);
  }

  await syncStockAggregateFromHoldings();

  return ok({ id, deleted: true });
}
