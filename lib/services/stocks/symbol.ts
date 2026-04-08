export function normalizeStockSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\.PSE$/i, "");
}
