import { Topbar } from "@/components/layout/topbar";
import { getAssetsData } from "@/lib/data";
import { formatPHP } from "@/lib/data/format";

export default async function BankAssetsPage() {
  const data = await getAssetsData();
  const totalLiquidity = data.bankAccounts.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <Topbar title="Bank Asset" subtitle="Liquid accounts and available balances" primaryAction="+ Add Account" secondaryAction="Export" />

      <section className="grid gap-4 xl:grid-cols-[320px,1fr]">
        <article className="panel stagger p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Total Bank Liquidity</p>
          <p className="mt-2 text-3xl font-semibold text-accent">{formatPHP(totalLiquidity)}</p>
          <p className="mt-2 text-sm text-muted">Aggregated from linked bank assets.</p>
        </article>

        <article className="panel stagger p-5">
          <h2 className="mb-3 text-lg font-semibold">Bank Accounts</h2>
          <ul className="divide-y divide-line">
            {data.bankAccounts.map((account) => (
              <li key={account.name} className="flex items-center justify-between py-3 text-sm">
                <span>{account.name}</span>
                <span className="font-semibold">{formatPHP(account.amount)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}
