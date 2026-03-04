import { formatPHP } from "@/lib/data/format";

import type { DashboardTransaction } from "@/types/finance";

type TransactionsTableProps = {
  transactions: DashboardTransaction[];
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="py-2">Transaction</th>
            <th className="py-2">Category</th>
            <th className="py-2">Date</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((item) => (
            <tr key={item.name} className="border-b border-line/70 transition hover:bg-soft-line/40">
              <td className="py-3 font-medium">{item.name}</td>
              <td className="py-3">
                <span className="rounded-full bg-soft-line px-2 py-1 text-xs font-semibold">{item.category}</span>
              </td>
              <td className="py-3 text-muted">{item.date}</td>
              <td className="py-3 text-right font-semibold">{formatPHP(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
