import { PortfolioManager } from "@/components/investments/portfolio-manager";
import { getAssetsData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";

type PlotPoint = {
  x: number;
  y: number;
};

function buildPlot(values: number[], width: number, height: number, padX: number, padY: number): PlotPoint[] {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  return values.map((value, index) => {
    const x = padX + (usableW * index) / Math.max(values.length - 1, 1);
    const y = padY + ((max - value) / range) * usableH;
    return { x, y };
  });
}

function toLine(points: PlotPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export default async function InvestmentAssetsPage() {
  const data = await getAssetsData();
  const salary = data.salaryInsights;
  const totalLiquidity = data.bankAccounts.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = data.summaryCards[0]?.value || 0;
  const weightedReturn =
    data.holdings.reduce((sum, item) => sum + item.apy * item.value, 0) /
    Math.max(data.holdings.reduce((sum, item) => sum + item.value, 0), 1);

  const chartW = 760;
  const chartH = 290;
  const chartPadX = 34;
  const chartPadY = 24;
  const points = buildPlot(
    data.trend.map((point) => point.value),
    chartW,
    chartH,
    chartPadX,
    chartPadY,
  );
  const area = `${points[0]?.x},${chartH - chartPadY} ${toLine(points)} ${points[points.length - 1]?.x},${chartH - chartPadY}`;

  return (
    <section className="panel w-full min-w-0 bg-[#f8fbff] p-0">
      <header className="flex flex-wrap items-center justify-between border-b border-line bg-white px-6 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-accent text-xs text-white">F</div>
          <span>FinTrack Pro</span>
        </div>
        <nav className="hidden items-center gap-5 text-xs font-semibold text-muted md:flex">
          <span>Dashboard</span>
          <span className="text-accent">Assets</span>
          <span>Liabilities</span>
          <span>Reports</span>
        </nav>
        <div className="flex items-center gap-3 text-xs">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">JD</div>
          <span className="font-semibold">John Doe</span>
        </div>
      </header>

      <div className="min-w-0 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Asset Portfolio</h1>
            <p className="text-sm text-muted">{data.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.summaryCards.map((card, index) => (
              <article key={card.label} className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{index === 0 ? "Net Worth" : "Monthly Divs"}</p>
                <p className="mt-1 text-3xl font-semibold text-[#273649]">{formatPHP(card.value).replace("PHP", "₱")}</p>
              </article>
            ))}
          </div>
        </div>

        {salary ? (
          <section className="mb-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Salary Net Pay ({salary.month})</p>
              <p className="mt-1 text-2xl font-semibold text-[#273649]">{formatPHP(salary.netPay).replace("PHP", "₱")}</p>
              <p className="mt-1 text-xs text-muted">Take-home ratio {salary.takeHomeRatio.toFixed(1)}%</p>
            </article>
            <article className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Suggested Monthly Contribution</p>
              <p className="mt-1 text-2xl font-semibold text-accent">{formatPHP(salary.suggestedAssetBudget).replace("PHP", "₱")}</p>
              <p className="mt-1 text-xs text-muted">{salary.suggestedRatePercent}% of net salary</p>
            </article>
            <article className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Passive Income Coverage</p>
              <p className="mt-1 text-2xl font-semibold text-success">{salary.passiveCoveragePercent.toFixed(1)}%</p>
              <p className="mt-1 text-xs text-muted">{formatPHP(salary.passiveIncome).replace("PHP", "₱")} vs net salary</p>
            </article>
          </section>
        ) : null}

        <section className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-4">
            <article className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Bank Accounts</h2>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Liquid</span>
              </div>
              <ul className="mt-2 divide-y divide-line text-sm">
                {data.bankAccounts.map((account) => (
                  <li key={account.name} className="flex items-center justify-between py-3">
                    <span>{account.name}</span>
                    <span className="font-semibold">{formatPHP(account.amount).replace("PHP", "₱")}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-line pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Liquidity</span>
                  <span className="font-semibold text-accent">{formatPHP(totalLiquidity).replace("PHP", "₱")}</span>
                </div>
              </div>
            </article>

          </div>

          <div className="grid min-w-0 gap-4">
            <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Portfolio Trend</h2>
                  <p className="text-xs text-muted">Growth across Stocks, UITF, and MP2</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2 text-xs">
                  <span className="whitespace-nowrap rounded-full bg-soft-line px-2 py-1">1M</span>
                  <span className="whitespace-nowrap rounded-full bg-accent px-2 py-1 text-white">YTD</span>
                  <span className="whitespace-nowrap rounded-full bg-soft-line px-2 py-1">ALL</span>
                </div>
              </div>

              <div className="max-w-full overflow-x-auto">
                <svg className="min-w-[680px]" viewBox={`0 0 ${chartW} ${chartH}`}>
                  {Array.from({ length: 6 }).map((_, index) => {
                    const y = chartPadY + ((chartH - chartPadY * 2) * index) / 5;
                    return <line key={y} x1={chartPadX} y1={y} x2={chartW - chartPadX} y2={y} stroke="#e7eef6" strokeWidth="1" />;
                  })}
                  <polygon points={area} fill="rgba(23, 152, 219, 0.15)" />
                  <polyline points={toLine(points)} fill="none" stroke="#1899dc" strokeWidth="3" />
                  {points.map((point) => (
                    <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="#1899dc" r="4" />
                  ))}
                </svg>
              </div>

              <div className="mt-2 grid grid-cols-8 text-[10px] text-muted">
                {data.trend.map((point, index) => (
                  <span key={`${point.label}-${index}`} className="text-center">{`${point.label} 25`}</span>
                ))}
              </div>
            </article>

            <PortfolioManager />
            </div>
         </section>
       </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-line bg-white px-6 py-3 text-sm sm:flex sm:items-center sm:gap-10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Total Assets Value</p>
          <p className="text-2xl font-semibold text-accent">{formatPHP(totalAssets).replace("PHP", "₱")}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Weighted Return</p>
          <p className="text-2xl font-semibold text-success">{weightedReturn.toFixed(2)}%</p>
        </div>
      </footer>
    </section>
  );
}
