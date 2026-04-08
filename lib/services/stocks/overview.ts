import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { StockHolding } from "@/models/StockHolding";
import { StockSnapshot } from "@/models/StockSnapshot";

import type { StockPortfolioData, StockPosition, TrendPoint } from "@/types/finance";

function monthLabel(month: string) {
  const [year, monthNum] = month.split("-");
  return `${monthNum}/${year.slice(2)}`;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export async function getStockPortfolioData(): Promise<StockPortfolioData> {
  await connectToDatabase();

  const [stocks, snapshots] = await Promise.all([
    StockHolding.find({ isActive: true }).sort({ symbol: 1 }).lean(),
    StockSnapshot.find().sort({ month: 1, capturedAt: 1 }).lean(),
  ]);

  const positions: StockPosition[] = stocks.map((item) => {
    const symbol = (item.symbol || "").trim().toUpperCase();
    const shares = Math.max(asNumber(item.shares, 0), 0);
    const hasShares = shares > 0;
    const averageCost = Math.max(asNumber(item.averageCost, 0), 0);
    const rawLastPrice = asNumber(item.lastPrice, 0);
    const lastPrice = rawLastPrice > 0 ? rawLastPrice : averageCost;
    const marketValue = hasShares ? lastPrice * shares : 0;
    const costBasis = hasShares ? averageCost * shares : 0;
    const unrealizedPnL = marketValue - costBasis;
    const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

    return {
      id: String(item._id),
      name: item.name,
      symbol,
      exchange: (item.exchange || "PSE").toUpperCase(),
      shares,
      averageCost,
      lastPrice,
      marketValue,
      costBasis,
      unrealizedPnL,
      unrealizedPnLPercent,
      lastPriceAt: item.lastPriceAt ? new Date(item.lastPriceAt).toISOString() : undefined,
      priceSource: item.priceSource || undefined,
    };
  });

  const monthlyTotals = new Map<string, number>();
  for (const snap of snapshots) {
    monthlyTotals.set(snap.month, (monthlyTotals.get(snap.month) || 0) + (snap.marketValue || 0));
  }

  const trend: TrendPoint[] =
    monthlyTotals.size > 0
      ? Array.from(monthlyTotals.entries()).map(([month, value]) => ({
          label: monthLabel(month),
          value: roundMoney(value),
        }))
      : [
          {
            label: monthLabel(toMonthKey(new Date())),
            value: roundMoney(positions.reduce((sum, item) => sum + item.marketValue, 0)),
          },
        ];

  const latestMonth = monthlyTotals.size > 0 ? Array.from(monthlyTotals.keys()).at(-1) || null : null;
  const previousMonth = monthlyTotals.size > 1 ? Array.from(monthlyTotals.keys()).at(-2) || null : null;
  const latestValue = latestMonth ? monthlyTotals.get(latestMonth) || 0 : positions.reduce((sum, item) => sum + item.marketValue, 0);
  const previousValue = previousMonth ? monthlyTotals.get(previousMonth) || 0 : latestValue;
  const monthlyChange = latestValue - previousValue;
  const totalMarketValue = positions.reduce((sum, item) => sum + item.marketValue, 0);
  const totalPnL = positions.reduce((sum, item) => sum + item.unrealizedPnL, 0);

  return {
    title: "Stock Portfolio",
    subtitle: "Monthly PSE stock tracking and valuation",
    summaryCards: [
      {
        label: "Total Market Value",
        value: roundMoney(totalMarketValue),
        note: "Based on active stock holdings",
      },
      {
        label: "Unrealized P/L",
        value: roundMoney(totalPnL),
        note: "Difference between market value and cost basis",
      },
      {
        label: "Monthly Change",
        value: roundMoney(monthlyChange),
        note: previousMonth ? `Compared against ${previousMonth}` : "Capture prior month for comparison",
      },
    ],
    trend,
    positions,
    latestMonth,
    previousMonth,
    asOf: new Date().toISOString(),
  };
}
