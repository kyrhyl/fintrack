import { formatPHP } from "@/lib/data/format";

import type { DashboardData } from "@/types/finance";

type IncomeStatementProps = {
  statement?: DashboardData["incomeStatement"];
  totalIncome: number;
  activeIncome: number;
  passiveIncome: number;
  budgetUtilizationPercent: number;
};

export function IncomeStatement({
  statement,
  totalIncome,
  activeIncome,
  passiveIncome,
  budgetUtilizationPercent,
}: IncomeStatementProps) {
  if (!statement) {
    return null;
  }

  const passiveActiveRatio = activeIncome > 0 ? Math.round((passiveIncome / activeIncome) * 100) : 0;

  function expenseTone(label: string) {
    const normalized = label.toLowerCase();
    if (normalized.includes("debt")) return "debt";
    if (normalized.includes("saving")) return "savings";
    return "personal";
  }

  return (
    <article className="panel stagger compact-card income-card overflow-hidden">
      <div className="compact-card-header">
        <h3 className="text-base font-semibold">Income Statement</h3>
        <span className="badge-positive">Monthly</span>
      </div>

      <div className="compact-section income-overview">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="compact-label">Total Income</p>
            <p className="compact-total-income">{formatPHP(totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="compact-label">Passive/Active Ratio</p>
            <p className="compact-ratio-value text-accent">{passiveActiveRatio}%</p>
          </div>
        </div>
        <div className="income-ratio-track mt-3">
          <div className="income-ratio-fill" style={{ width: `${Math.min(100, passiveActiveRatio)}%` }} />
        </div>
      </div>

      <div className="compact-section income-sources pt-0">
        <div className="space-y-2">
          <div className="compact-metric-row income-source-row">
            <span className="compact-dot compact-dot-active" />
            <span className="text-muted">Active (Salary/Business)</span>
            <span className="ml-auto font-semibold tabular-nums">{formatPHP(activeIncome)}</span>
          </div>
          <div className="compact-metric-row income-source-row">
            <span className="compact-dot compact-dot-passive" />
            <span className="text-muted">Passive (Dividends/Rents)</span>
            <span className="ml-auto font-semibold tabular-nums">{formatPHP(passiveIncome)}</span>
          </div>
        </div>
      </div>

      <div className="compact-section section-split income-expenses">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <p className="compact-label">Total Expenses</p>
            <p className="compact-total-expense">{formatPHP(statement.totals.expenses)}</p>
          </div>
          <span className="badge-danger">{Math.round(budgetUtilizationPercent)}% of Budget</span>
        </div>

        <div className="space-y-3">
          {statement.expenses.map((item) => (
            <div key={item.label} className="income-expense-row grid grid-cols-[90px_minmax(0,1fr)_46px_auto] items-center gap-2 text-sm">
              <span className="text-muted">{item.label}</span>
              <div className="mini-track">
                <div
                  className={`mini-fill income-fill income-fill-${expenseTone(item.label)}`}
                  style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }}
                />
              </div>
              <span className="text-right font-semibold text-muted tabular-nums">{item.percentage}%</span>
              <span className="text-right font-semibold tabular-nums">{formatPHP(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
