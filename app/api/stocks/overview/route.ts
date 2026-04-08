import { ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { getStockPortfolioData } from "@/lib/services/stocks/overview";

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const payload = await getStockPortfolioData();

  return ok(payload);
}
