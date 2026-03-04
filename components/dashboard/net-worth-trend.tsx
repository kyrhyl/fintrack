import { formatPHP } from "@/lib/data/format";

import type { NetWorthTrendData } from "@/types/finance";

type NetWorthTrendProps = {
  trend: NetWorthTrendData;
};

type Point = { x: number; y: number };

function buildPlot(values: number[], width: number, height: number, padX: number, padY: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  return values.map((value, index) => {
    const x = padX + (usableW * index) / Math.max(values.length - 1, 1);
    const y = padY + ((max - value) / range) * usableH;
    return { x, y } satisfies Point;
  });
}

function toLine(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function NetWorthTrend({ trend }: NetWorthTrendProps) {
  if (trend.points.length === 0 || !trend.latest) {
    return (
      <article className="dashboard-mini-card md:col-span-3">
        <p className="text-sm font-semibold">Monthly Net Worth Trend</p>
        <p className="mt-2 text-sm text-muted">No snapshots yet. Trend starts after your first dashboard visit this month.</p>
      </article>
    );
  }

  const values = trend.points.map((point) => point.value);
  const chartW = 760;
  const chartH = 180;
  const chartPadX = 28;
  const chartPadY = 18;
  const points = buildPlot(values, chartW, chartH, chartPadX, chartPadY);
  const polyline = toLine(points);
  const area = `${points[0]?.x},${chartH - chartPadY} ${polyline} ${points[points.length - 1]?.x},${chartH - chartPadY}`;
  const deltaTone = trend.delta >= 0 ? "text-success" : "text-danger";
  const deltaSign = trend.delta >= 0 ? "+" : "";

  return (
    <article className="dashboard-mini-card md:col-span-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Monthly Net Worth Trend</p>
          <p className="text-xs text-muted">Auto-updated monthly snapshot</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">{formatPHP(trend.latest.value)}</p>
          <p className={`text-xs font-semibold ${deltaTone}`}>
            {`${deltaSign}${formatPHP(Math.abs(trend.delta))} (${deltaSign}${Math.abs(trend.deltaPercent).toFixed(2)}%) vs prev month`}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg className="min-w-[680px]" viewBox={`0 0 ${chartW} ${chartH}`}>
          {Array.from({ length: 4 }).map((_, index) => {
            const y = chartPadY + ((chartH - chartPadY * 2) * index) / 3;
            return (
              <line
                key={y}
                x1={chartPadX}
                y1={y}
                x2={chartW - chartPadX}
                y2={y}
                stroke="#e7eef6"
                strokeWidth="1"
              />
            );
          })}
          <polygon points={area} fill="rgba(23, 152, 219, 0.14)" />
          <polyline points={polyline} fill="none" stroke="#1899dc" strokeWidth="3" />
          {points.map((point) => (
            <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="#1899dc" r="3.8" />
          ))}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] text-muted md:grid-cols-12">
        {trend.points.map((point) => (
          <span key={point.month} className="text-center">
            {point.label}
          </span>
        ))}
      </div>
    </article>
  );
}
