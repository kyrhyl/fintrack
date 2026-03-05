import { PortfolioManager } from "@/components/investments/portfolio-manager";
import { PortfolioTrendChart } from "@/components/investments/portfolio-trend-chart";
import { getAssetsData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";

export default async function InvestmentAssetsPage() {
  const data = await getAssetsData();
  const salary = data.salaryInsights;
  const totalLiquidity = data.bankAccounts.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = data.summaryCards[0]?.value || 0;
  const weightedReturn =
    data.holdings.reduce((sum, item) => sum + item.apy * item.value, 0) /
    Math.max(data.holdings.reduce((sum, item) => sum + item.value, 0), 1);

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
            <PortfolioTrendChart trend={data.trend} />

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
