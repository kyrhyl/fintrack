import { BalanceSheet } from "@/components/dashboard/balance-sheet";
import { IncomeStatement } from "@/components/dashboard/income-statement";
import { NetWorthTrend } from "@/components/dashboard/net-worth-trend";
import { getDashboardData, getNetWorthTrendData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";

export default async function DashboardPage() {
  const [data, netWorthTrend] = await Promise.all([
    getDashboardData(),
    getNetWorthTrendData(),
  ]);
  const metricsByLabel = new Map(data.metrics.map((item) => [item.label, item]));

  const totalIncome = data.financialSummary?.totalIncome || 0;
  const activeIncome = data.financialSummary?.activeIncome || 0;
  const passiveIncome = data.financialSummary?.passiveIncome || 0;
  const liabilitiesPayment = data.balanceSheet?.totals.liabilitiesPayment || 0;
  const expenseToIncomeRatio =
    totalIncome > 0 ? Math.round(((data.incomeStatement?.totals.expenses || 0) / totalIncome) * 100) : 0;

  const debtToPassiveRatio = passiveIncome > 0 ? Math.round((liabilitiesPayment / passiveIncome) * 100) : 0;
  const debtToIncomeRatio = totalIncome > 0 ? Math.round((liabilitiesPayment / totalIncome) * 100) : 0;

  const savingsExpense =
    data.incomeStatement?.expenses.find((item) => item.label.toLowerCase() === "savings")?.value || 0;
  const savingsTarget = Math.max(totalIncome * 0.12, 1);
  const savingsProgress = Math.min(100, Math.round((savingsExpense / savingsTarget) * 100));

  const portfolioYield =
    (data.balanceSheet?.totals.assets || 0) > 0
      ? (((data.balanceSheet?.totals.assetsIncome || 0) * 12) / (data.balanceSheet?.totals.assets || 1)) * 100
      : 0;

  const creditUtilization =
    (data.balanceSheet?.totals.assets || 0) > 0
      ? ((data.balanceSheet?.totals.liabilities || 0) / (data.balanceSheet?.totals.assets || 1)) * 100
      : 0;

  const kpiCards = [
    {
      label: "Net Worth",
      value: metricsByLabel.get("Net Worth")?.value || 0,
      note: metricsByLabel.get("Net Worth")?.note || "Assets - Liabilities",
      valueClass: "",
      iconClass: "bg-[#dff4e7] text-success",
    },
    {
      label: "Liquid Funds",
      value: metricsByLabel.get("Liquid Funds")?.value || 0,
      note: metricsByLabel.get("Liquid Funds")?.note || "Available for withdrawal",
      valueClass: "",
      iconClass: "bg-[#e4f0ff] text-accent",
    },
    {
      label: "Monthly Cash Flow",
      value: metricsByLabel.get("Monthly Cash Flow")?.value || 0,
      note: "Income - Expenses",
      valueClass: "text-success",
      iconClass: "bg-[#f0eaff] text-[#8b5cf6]",
    },
    {
      label: "Cash on Hand",
      value: metricsByLabel.get("Cash on Hand")?.value || 0,
      note: "Physical + Bank balances",
      valueClass: "",
      iconClass: "bg-[#fff0e4] text-warning",
    },
  ];

  return (
    <section className="panel dashboard-page-slim p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Personal Finance Overview</h1>
          <p className="text-sm text-muted">{data.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold" type="button">
            Export
          </button>
        </div>
      </div>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <article key={card.label} className="dashboard-kpi-card">
            <div className="mb-1 flex items-center justify-between">
              <p className="dashboard-kpi-label">{card.label}</p>
              <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold ${card.iconClass}`}>●</span>
            </div>
            <p className={`dashboard-kpi-value ${card.valueClass}`}>{formatPHP(card.value)}</p>
            <p className={`dashboard-kpi-note ${card.label === "Net Worth" ? "text-success" : ""}`}>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-3">
          <IncomeStatement
            statement={data.incomeStatement}
            totalIncome={totalIncome}
            activeIncome={activeIncome}
            passiveIncome={passiveIncome}
            budgetUtilizationPercent={expenseToIncomeRatio}
          />
        </div>

        <BalanceSheet statement={data.balanceSheet} />
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <NetWorthTrend trend={netWorthTrend} />

        <article className="dashboard-mini-card">
          <p className="text-sm font-semibold">Financial Ratios</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted">Debt / Passive</p>
              <p className="mt-1 text-xl font-semibold text-danger">{debtToPassiveRatio}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted">Debt / Income</p>
              <p className="mt-1 text-xl font-semibold text-warning">{debtToIncomeRatio}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted">Credit Util</p>
              <p className={`mt-1 text-xl font-semibold ${creditUtilization <= 30 ? "text-success" : "text-warning"}`}>
                {creditUtilization.toFixed(0)}%
              </p>
              <p className="text-[10px] text-muted">{creditUtilization <= 30 ? "Healthy" : "High"}</p>
            </div>
          </div>
        </article>

        <article className="dashboard-mini-card">
          <p className="text-sm font-semibold">Investment Performance</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted">Portfolio Yield</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{portfolioYield.toFixed(1)}%</p>
              <p className="text-[10px] text-muted">Annualized</p>
            </div>
            <div>
              <p className="text-xs text-muted">Savings Goal</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{savingsProgress}%</p>
              <div className="mt-1 h-1.5 rounded-full bg-soft-line">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${savingsProgress}%` }} />
              </div>
              <p className="text-[10px] text-muted">{formatPHP(savingsExpense)} saved</p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
