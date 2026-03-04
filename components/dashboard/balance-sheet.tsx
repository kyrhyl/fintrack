import { formatPHP } from "@/lib/data/format";

import type { DashboardData } from "@/types/finance";

type BalanceSheetProps = {
  statement?: DashboardData["balanceSheet"];
};

export function BalanceSheet({ statement }: BalanceSheetProps) {
  if (!statement) {
    return null;
  }

  return (
    <article className="panel stagger compact-card overflow-hidden">
      <div className="compact-card-header">
        <h3 className="text-base font-semibold">Balance Sheet</h3>
        <span className="badge-info">Consolidated</span>
      </div>

      <div className="compact-section balance-sheet-assets">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-success">Assets</p>
          <p className="text-base font-semibold tabular-nums">{statement.totals.assets.toLocaleString("en-PH", { style: "currency", currency: "PHP" })}</p>
        </div>
        <div className="balance-sheet-col-head balance-sheet-col-head-assets grid grid-cols-[minmax(0,1fr)_120px_92px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span>Category</span>
          <span className="text-right whitespace-nowrap">Value</span>
          <span className="text-right whitespace-nowrap">Yield</span>
        </div>
        <div className="space-y-1">
          {statement.assets.map((asset) => (
            <div key={asset.label} className="statement-divider balance-sheet-item-row grid grid-cols-[minmax(0,1fr)_120px_92px] gap-2 text-[13px]">
              <span className="text-foreground">{asset.label}</span>
              <span className="text-right font-semibold tabular-nums whitespace-nowrap">{formatPHP(asset.value)}</span>
              <span className="text-right font-semibold tabular-nums text-success whitespace-nowrap">{asset.income > 0 ? `+${formatPHP(asset.income)}` : "-"}</span>
            </div>
          ))}
        </div>

        <div className="balance-sheet-section-total balance-sheet-section-total-assets grid grid-cols-[minmax(0,1fr)_120px_92px] gap-2 text-[13px]">
          <span>Total Assets</span>
          <span className="text-right tabular-nums whitespace-nowrap">{formatPHP(statement.totals.assets)}</span>
          <span className="text-right tabular-nums text-success whitespace-nowrap">+{formatPHP(statement.totals.assetsIncome)}</span>
        </div>
      </div>

      <div className="compact-section section-split balance-sheet-liabilities">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-danger">Liabilities</p>
          <p className="text-base font-semibold tabular-nums">{formatPHP(statement.totals.liabilities)}</p>
        </div>
        <div className="balance-sheet-col-head balance-sheet-col-head-liability grid grid-cols-[minmax(0,1fr)_120px_92px] gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span>Debt Item</span>
          <span className="text-right whitespace-nowrap">Principal</span>
          <span className="text-right whitespace-nowrap">Payment</span>
        </div>
        <div className="space-y-1">
          {statement.liabilities.map((liability, index) => (
            <div key={`${liability.label}-${liability.debt}-${liability.payment}-${index}`} className="statement-divider balance-sheet-item-row grid grid-cols-[minmax(0,1fr)_120px_92px] gap-2 text-[13px]">
              <span className="text-foreground">{liability.label}</span>
              <span className="text-right font-semibold tabular-nums whitespace-nowrap">{formatPHP(liability.debt)}</span>
              <span className="text-right font-semibold tabular-nums text-danger whitespace-nowrap">{formatPHP(liability.payment)}</span>
            </div>
          ))}
        </div>

        <div className="balance-sheet-payment-summary mt-3 grid grid-cols-[minmax(0,1fr)_120px_92px] gap-2 text-[13px]">
          <span className="font-semibold">Totals</span>
          <span className="text-right font-semibold tabular-nums whitespace-nowrap">{formatPHP(statement.totals.liabilities)}</span>
          <span className="text-right font-semibold text-danger tabular-nums whitespace-nowrap">{formatPHP(statement.totals.liabilitiesPayment)}</span>
        </div>
      </div>
    </article>
  );
}
