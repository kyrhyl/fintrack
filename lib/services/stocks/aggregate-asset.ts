import { Asset } from "@/models/Investment";
import { StockHolding } from "@/models/StockHolding";
import {
  isStockPortfolioAggregateAsset,
  STOCK_PORTFOLIO_ASSET_NAME,
  STOCK_PORTFOLIO_ASSET_NOTE_TAG,
} from "@/lib/stocks/constants";

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

const STOCK_PORTFOLIO_ANNUAL_YIELD_PERCENT = 6;

export async function upsertStockPortfolioAggregateAsset(totalValue: number) {
  const roundedValue = roundMoney(Math.max(totalValue, 0));
  const monthlyIncome = roundMoney((roundedValue * (STOCK_PORTFOLIO_ANNUAL_YIELD_PERCENT / 100)) / 12);

  const aggregate = await Asset.findOneAndUpdate(
    {
      type: "stock",
      $or: [{ notes: { $regex: STOCK_PORTFOLIO_ASSET_NOTE_TAG, $options: "i" } }, { name: STOCK_PORTFOLIO_ASSET_NAME }],
    },
    {
      $set: {
        name: STOCK_PORTFOLIO_ASSET_NAME,
        type: "stock",
        currentValue: roundedValue,
        annualYieldPercent: STOCK_PORTFOLIO_ANNUAL_YIELD_PERCENT,
        monthlyIncome,
        institution: "PSE",
        isLiquid: false,
        isActive: true,
        notes: `${STOCK_PORTFOLIO_ASSET_NOTE_TAG} Managed automatically from Stock Portfolio page.`,
      },
      $setOnInsert: {
        acquiredAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  if (!aggregate) {
    return;
  }

  await Asset.updateMany(
    {
      type: "stock",
      isActive: true,
      _id: { $ne: aggregate._id },
    },
    {
      $set: {
        isActive: false,
        notes: `${STOCK_PORTFOLIO_ASSET_NOTE_TAG} Migrated legacy stock detail. Manage stocks in /stock-portfolio.`,
      },
    },
  );
}

export async function syncStockAggregateFromHoldings() {
  const holdings = await StockHolding.find({ isActive: true }).lean();
  const total = holdings.reduce((sum, item) => {
    const shares = Number(item.shares || 0);
    const price = Number(item.lastPrice || item.averageCost || 0);
    if (!Number.isFinite(shares) || !Number.isFinite(price)) {
      return sum;
    }
    return sum + shares * price;
  }, 0);

  await upsertStockPortfolioAggregateAsset(total);
}

export function isManagedStockAggregate(asset: { type?: string; name?: string; notes?: string }) {
  return isStockPortfolioAggregateAsset(asset);
}
