import { PortfolioTrendChart } from "@/components/investments/portfolio-trend-chart";
import { Topbar } from "@/components/layout/topbar";
import { StockCaptureButton } from "@/components/stocks/stock-capture-button";
import { StockHoldingsManager } from "@/components/stocks/stock-holdings-manager";
import { formatPHP } from "@/lib/data/format";
import { getStockPortfolioData } from "@/lib/services/stocks/overview";

export const dynamic = "force-dynamic";

export default async function StockPortfolioPage() {
  const data = await getStockPortfolioData();

  return (
    <section className="panel w-full min-w-0 bg-[#f8fbff] p-0">
      <div className="md:hidden">
        <Topbar title={data.title} subtitle={data.subtitle} />
      </div>

      <div className="min-w-0 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{data.title}</h1>
            <p className="text-sm text-muted">{data.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <StockCaptureButton />
          </div>
        </div>
        <p className="mb-4 text-xs text-muted">Prices are based on your manually imported broker holdings.</p>

        <section className="mb-4 grid gap-3 md:grid-cols-3">
          {data.summaryCards.map((card) => (
            <article key={card.label} className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#273649]">{formatPHP(card.value)}</p>
              <p className="mt-1 text-xs text-muted">{card.note}</p>
            </article>
          ))}
        </section>

        <div className="mb-4">
          <PortfolioTrendChart trend={data.trend} />
        </div>

        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">PSE Positions</h2>
              <p className="text-xs text-muted">As of {new Date(data.asOf).toLocaleString("en-PH")}</p>
            </div>
          </div>

          <div className="max-w-full overflow-auto">
            <table className="w-full min-w-[820px] table-auto text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Name</th>
                  <th className="py-2 text-right">Shares</th>
                  <th className="py-2 text-right">Avg Cost</th>
                  <th className="py-2 text-right">Last Price</th>
                  <th className="py-2 text-right">Market Value</th>
                  <th className="py-2 text-right">Unrealized P/L</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.length === 0 ? (
                  <tr>
                    <td className="py-4 text-muted" colSpan={7}>
                      No stock holdings yet. Add entries in the Manage Holdings section below.
                    </td>
                  </tr>
                ) : null}

                {data.positions.map((position) => (
                  <tr key={position.id} className="border-b border-line/70">
                    <td className="py-3 font-semibold">{position.symbol || "-"}</td>
                    <td className="py-3">{position.name}</td>
                    <td className="py-3 text-right">{position.shares > 0 ? position.shares.toLocaleString("en-PH") : "-"}</td>
                    <td className="py-3 text-right">{formatPHP(position.averageCost)}</td>
                    <td className="py-3 text-right">{formatPHP(position.lastPrice)}</td>
                    <td className="py-3 text-right font-semibold">{formatPHP(position.marketValue)}</td>
                    <td
                      className={`py-3 text-right font-semibold ${
                        position.unrealizedPnL >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {formatPHP(position.unrealizedPnL)} ({position.unrealizedPnLPercent.toFixed(2)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4">
          <StockHoldingsManager />
        </div>
      </div>
    </section>
  );
}
