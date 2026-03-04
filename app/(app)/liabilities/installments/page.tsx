import { DebtsTable } from "@/components/debts/debts-table";
import { Topbar } from "@/components/layout/topbar";
import { getDebtsData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";
import { OPEN_LIABILITY_CREATE_EVENT } from "@/lib/events";
import { isInstallmentLoan } from "@/lib/liabilities/segments";

export default async function InstallmentsPage() {
  const data = await getDebtsData();
  const loans = data.loans.filter(isInstallmentLoan);

  return (
    <>
      <Topbar
        title="Liabilities - Installments"
        subtitle={data.subtitle}
        primaryAction="+ New Liability"
        primaryActionEvent={OPEN_LIABILITY_CREATE_EVENT}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((card) => (
          <article key={card.label} className="panel stagger p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                card.tone === "danger" ? "text-danger" : card.tone === "warning" ? "text-warning" : ""
              }`}
            >
              {card.value}
            </p>
            <p className="mt-2 text-xs text-muted">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
        <article className="panel stagger p-5">
          <h2 className="mb-3 text-lg font-semibold">Installment Liabilities</h2>
          <DebtsTable loans={loans} />
        </article>

        <article className="grid gap-4">
          <div className="panel stagger p-5">
            <h3 className="text-base font-semibold">Debt-Free Projection</h3>
            <p className="mt-2 text-sm text-muted">Based on your current repayment schedule, you will be debt-free by</p>
            <p className="mt-4 text-4xl font-semibold text-accent">{data.projection.debtFreeBy}</p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm"><span className="text-muted">Debt Clearance Progress</span><span className="font-semibold">{data.projection.progress}%</span></div>
              <div className="h-2 rounded-full bg-soft-line"><div className="h-2 rounded-full bg-accent" style={{ width: `${data.projection.progress}%` }} /></div>
            </div>
            <button className="mt-5 w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white">Accelerate Payoff</button>
          </div>

          <div className="panel stagger p-5">
            <h3 className="text-base font-semibold">Recurring Bills</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {data.recurringBills.map((bill) => (
                <li key={bill.name} className="rounded-lg border border-line bg-surface p-3">
                  <p className="text-muted">{bill.name}</p>
                  <p className="mt-1 font-semibold">{formatPHP(bill.amount)}</p>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </>
  );
}
