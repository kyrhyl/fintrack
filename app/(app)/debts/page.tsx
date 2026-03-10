import { DebtsTable } from "@/components/debts/debts-table";
import { DebtsHeaderActions } from "@/components/debts/debts-header-actions";
import { Topbar } from "@/components/layout/topbar";
import { getDebtsData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";

function toRemainingLabel(months: number) {
  if (months <= 0) {
    return "Debt-free now";
  }

  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} year${years === 1 ? "" : "s"}`);
  }

  if (remainder > 0) {
    parts.push(`${remainder} month${remainder === 1 ? "" : "s"}`);
  }

  return `${parts.join(" and ")} remaining`;
}

export default async function DebtsPage() {
  const data = await getDebtsData();

  return (
    <section className="panel p-5">
      <div className="md:hidden">
        <Topbar title="Debts" subtitle={data.subtitle} />
      </div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Liability &amp; Debt Repayment</h1>
          <p className="text-sm text-muted">{data.subtitle}</p>
        </div>
        <DebtsHeaderActions />
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((card) => (
          <article key={card.label} className="dashboard-kpi-card">
            <p className="dashboard-kpi-label">{card.label}</p>
            <p
              className={`dashboard-kpi-value ${
                card.tone === "danger" ? "text-danger" : card.tone === "warning" ? "text-warning" : ""
              }`}
            >
              {card.value}
            </p>
            <p className="dashboard-kpi-note">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.28fr,0.72fr]">
        <article className="panel p-4">
          <DebtsTable loans={data.loans} />
        </article>

        <article className="grid gap-4">
          <div className="panel p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">Recurring Bills</h3>
              <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">{`${formatPHP(data.recurringBills.reduce((sum, bill) => sum + bill.amount, 0))} Total`}</span>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {data.recurringBills.map((bill) => (
                <li key={bill.name} className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-muted">{bill.name}</p>
                  <p className="mt-1 font-semibold">{formatPHP(bill.amount)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#1f8ccf] bg-gradient-to-b from-[#1fa6e8] to-[#147ec2] p-5 text-white shadow-[0_14px_28px_rgba(20,126,194,0.35)]">
            <h3 className="text-base font-semibold">Debt-Free Projection</h3>
            <p className="mt-2 text-sm text-white/80">Based on your current repayment schedule, you will be debt-free by</p>
            <p className="mt-4 text-5xl font-semibold">{data.projection.debtFreeBy}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/70">{toRemainingLabel(data.projection.remainingMonths)}</p>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-sm"><span className="text-white/80">Debt Clearance Progress</span><span className="font-semibold">{data.projection.progress}%</span></div>
              <div className="h-2 rounded-full bg-white/30"><div className="h-2 rounded-full bg-white" style={{ width: `${data.projection.progress}%` }} /></div>
            </div>
            <button className="mt-5 w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white">Accelerate Payoff</button>
          </div>
        </article>
      </section>
    </section>
  );
}
