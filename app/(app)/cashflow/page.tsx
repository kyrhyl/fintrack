import { getDashboardData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";

function donutFromMix(mix: Array<{ label: string; percentage: number }>) {
  const debt = mix.find((item) => item.label.toLowerCase() === "debt")?.percentage || 0;
  const personal = mix.find((item) => item.label.toLowerCase() === "personal")?.percentage || 0;
  const savings = mix.find((item) => item.label.toLowerCase() === "savings")?.percentage || 0;
  return {
    debt,
    personal,
    savings,
    style: {
      background: `conic-gradient(#f59a3a 0 ${debt}%, #35c69a ${debt}% ${debt + personal}%, #b57df4 ${debt + personal}% 100%)`,
    },
  };
}

export default async function CashflowPage() {
  const data = await getDashboardData();
  const mix = donutFromMix(data.spendingMix);
  const totalExpenses = data.transactions.reduce((sum, row) => sum + row.amount, 0);
  const netWorth = data.metrics.find((item) => item.label === "Net Worth")?.value || 0;

  return (
    <section className="panel overflow-hidden bg-[#f8fbff] p-0">
      <header className="flex flex-wrap items-center justify-between border-b border-line bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-accent text-xs text-white">F</div>
          <span>FinTrack</span>
        </div>
        <nav className="hidden items-center gap-5 text-xs font-semibold text-muted md:flex">
          <span className="text-accent">Dashboard</span>
          <span>Expenses</span>
          <span>Savings</span>
          <span>Reports</span>
        </nav>
        <div className="flex items-center gap-3 text-xs">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-accent text-[10px] font-bold text-white">JD</div>
        </div>
      </header>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl font-semibold text-[#1f2b3d]">Daily Expense Tracker</h1>
            <p className="text-sm text-muted">As of February 20, 2026</p>
          </div>
          <button className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(23,152,219,0.28)]" type="button">
            + Add New Expense
          </button>
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px_140px]">
              <input
                className="h-10 rounded-lg border border-line bg-surface px-3 text-sm outline-none"
                defaultValue=""
                placeholder="Search transactions..."
                readOnly
              />
              <button className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-muted" type="button">
                All Categories
              </button>
              <button className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-muted" type="button">
                Last 30 Days
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-soft-line/60 text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                    <th className="px-3 py-3">Transaction</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((item) => (
                    <tr key={`${item.name}-${item.date}`} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-3 font-medium">{item.name}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-soft-line px-2 py-1 text-xs font-semibold">{item.category}</span>
                      </td>
                      <td className="px-3 py-3 text-muted">{item.date}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatPHP(item.amount).replace("PHP", "₱")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-center">
              <button className="text-sm font-semibold text-accent" type="button">View All Transactions</button>
            </div>
          </article>

          <aside className="grid gap-4">
            <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Spending Summary</h2>
              <div className="mx-auto my-4 h-44 w-44 rounded-full" style={mix.style}>
                <div className="m-7 h-[120px] w-[120px] rounded-full bg-white" />
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between"><span>Debt</span><span className="font-semibold">{mix.debt}%</span></li>
                <li className="flex items-center justify-between"><span>Personal</span><span className="font-semibold">{mix.personal}%</span></li>
                <li className="flex items-center justify-between"><span>Savings</span><span className="font-semibold">{mix.savings}%</span></li>
              </ul>
              <p className="mt-3 border-t border-line pt-3 text-base font-semibold">Total Monthly Expenses {formatPHP(totalExpenses).replace("PHP", "₱")}</p>
            </article>

            <article className="rounded-2xl border border-[#102444] bg-gradient-to-br from-[#0f2140] to-[#12294e] p-5 text-white shadow-[0_12px_28px_rgba(16,33,64,0.35)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/70">Net Worth</p>
                <span className="rounded-full border border-white/20 px-2 py-1 text-[10px] font-semibold">LIVE STATUS</span>
              </div>
              <p className="mt-2 text-5xl font-semibold">{formatPHP(netWorth).replace("PHP", "₱")}</p>
              <p className="mt-1 text-sm text-white/70">+2.4% from last month</p>
              <div className="mt-4">
                <p className="mb-1 text-xs text-white/70">Passive/Active Ratio</p>
                <div className="h-2 rounded-full bg-white/20"><div className="h-2 w-[17%] rounded-full bg-white" /></div>
              </div>
            </article>

            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-xl border border-line bg-white px-3 py-3 text-xs font-semibold" type="button">Download CSV</button>
              <button className="rounded-xl border border-line bg-white px-3 py-3 text-xs font-semibold" type="button">Budget Plan</button>
            </div>
          </aside>
        </section>
      </div>
    </section>
  );
}
