export const STOCK_PORTFOLIO_ASSET_NAME = "Stock Portfolio";
export const STOCK_PORTFOLIO_ASSET_NOTE_TAG = "[AUTO_STOCK_PORTFOLIO]";

type AggregateAssetLike = {
  type?: string;
  name?: string;
  notes?: string;
};

export function isStockPortfolioAggregateAsset(asset: AggregateAssetLike) {
  if (asset.type !== "stock") {
    return false;
  }

  const notes = (asset.notes || "").toUpperCase();
  if (notes.includes(STOCK_PORTFOLIO_ASSET_NOTE_TAG)) {
    return true;
  }

  return (asset.name || "").trim().toUpperCase() === STOCK_PORTFOLIO_ASSET_NAME.toUpperCase();
}
