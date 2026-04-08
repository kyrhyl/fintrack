import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { syncStockAggregateFromHoldings } from "@/lib/services/stocks/aggregate-asset";
import { normalizeStockSymbol } from "@/lib/services/stocks/symbol";
import { stockCaptureSchema } from "@/lib/validation";
import { StockHolding } from "@/models/StockHolding";
import { StockSnapshot } from "@/models/StockSnapshot";

import type { StockCaptureResult } from "@/types/finance";

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = stockCaptureSchema.parse(await request.json().catch(() => ({})));
    const month = payload.month || toMonthKey(new Date());

    await connectToDatabase();
    const stocks = await StockHolding.find({ isActive: true }).lean();
    const activeSymbols = new Set(
      stocks
        .map((stock) => normalizeStockSymbol(stock.symbol || stock.name || ""))
        .filter((symbol) => symbol.length > 0),
    );

    const failedSymbols: string[] = [];
    let capturedCount = 0;

    for (const stock of stocks) {
      const symbol = normalizeStockSymbol(stock.symbol || stock.name || "");
      if (!symbol) {
        failedSymbols.push(stock.name || "unknown");
        continue;
      }

      const shares = Math.max(asNumber(stock.shares, 0), 0);
      const hasShares = shares > 0;
      const averageCost = Math.max(asNumber(stock.averageCost, 0), 0);
      const rawLastPrice = asNumber(stock.lastPrice, 0);
      const closePrice = rawLastPrice > 0 ? rawLastPrice : averageCost;
      const source = stock.priceSource?.trim() || "manual";
      const quoteDate = stock.lastPriceAt ? new Date(stock.lastPriceAt) : new Date();

      if (closePrice <= 0) {
        failedSymbols.push(symbol);
        continue;
      }

      const marketValue = hasShares ? closePrice * shares : 0;
      const costBasis = hasShares ? averageCost * shares : 0;
      const unrealizedPnL = marketValue - costBasis;

      await StockSnapshot.findOneAndUpdate(
        { month, symbol },
        {
          month,
          symbol,
          name: stock.name,
          exchange: (stock.exchange || "PSE").toUpperCase(),
          closePrice: roundMoney(closePrice),
          shares: roundMoney(shares),
          marketValue: roundMoney(marketValue),
          costBasis: roundMoney(costBasis),
          unrealizedPnL: roundMoney(unrealizedPnL),
          capturedAt: quoteDate,
          source,
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );

      await StockHolding.updateOne(
        { _id: stock._id },
        {
          $set: {
            symbol,
            exchange: (stock.exchange || "PSE").toUpperCase(),
            lastPrice: roundMoney(closePrice),
            lastPriceAt: quoteDate,
            priceSource: source,
          },
        },
      );

      capturedCount += 1;
    }

    await StockSnapshot.deleteMany({
      month,
      symbol: { $nin: Array.from(activeSymbols) },
    });

    await syncStockAggregateFromHoldings();

    const result: StockCaptureResult = {
      month,
      capturedCount,
      failedSymbols,
    };

    return ok(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to capture monthly stock snapshot.", 500);
  }
}
