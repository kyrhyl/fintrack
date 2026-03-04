import { formatPHP } from "@/lib/data/format";

import type { DashboardMetric } from "@/types/finance";

type OverviewCardsProps = {
  metrics: DashboardMetric[];
};

const toneClass: Record<DashboardMetric["tone"], string> = {
  default: "text-muted",
  success: "text-success",
  danger: "text-danger",
};

export function OverviewCards({ metrics }: OverviewCardsProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((card) => (
        <article key={card.label} className="panel stagger p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold leading-tight">{formatPHP(card.value)}</p>
          <p className={`mt-2 text-xs font-medium ${toneClass[card.tone]}`}>{card.note}</p>
        </article>
      ))}
    </section>
  );
}
