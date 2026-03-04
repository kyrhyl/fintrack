import { formatPHP } from "@/lib/data/format";

import type { AssetsData } from "@/types/finance";

type HoldingsTableProps = {
  holdings: AssetsData["holdings"];
};

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
            <th className="py-2">Asset Name</th>
            <th className="py-2 text-right">Current Value</th>
            <th className="py-2 text-right">APY</th>
            <th className="py-2 text-right">Projected Monthly</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((item) => (
            <tr key={item.name} className="border-b border-line/70 transition hover:bg-soft-line/40">
              <td className="py-3 font-medium">{item.name}</td>
              <td className="py-3 text-right font-semibold">{formatPHP(item.value)}</td>
              <td className="py-3 text-right">{item.apy}%</td>
              <td className="py-3 text-right font-semibold text-success">{formatPHP(item.monthlyIncome)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
