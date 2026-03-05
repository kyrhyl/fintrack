"use client";

import { useMemo, useState } from "react";

import type { TrendPoint } from "@/types/finance";

type PortfolioTrendChartProps = {
  trend: TrendPoint[];
};

type PlotPoint = {
  x: number;
  y: number;
};

function buildPlot(values: number[], width: number, height: number, padX: number, padY: number): PlotPoint[] {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  return values.map((value, index) => {
    const x = padX + (usableW * index) / Math.max(values.length - 1, 1);
    const y = padY + ((max - value) / range) * usableH;
    return { x, y };
  });
}

function toLine(points: PlotPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

const RANGE_OPTIONS = [
  { id: "1m", label: "1M" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "ALL" },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]["id"];

export function PortfolioTrendChart({ trend }: PortfolioTrendChartProps) {
  const [range, setRange] = useState<RangeId>("ytd");

  const currentYear = new Date().getFullYear();

  const filteredTrend = useMemo(() => {
    if (trend.length === 0) return [];

    switch (range) {
      case "1m": {
        const lastTwo = trend.slice(-2);
        return lastTwo.length > 0 ? lastTwo : trend;
      }
      case "ytd": {
        return trend.filter((point) => {
          const yearMatch = point.label.includes(String(currentYear).slice(-2));
          return yearMatch;
        });
      }
      case "all":
      default:
        return trend;
    }
  }, [trend, range, currentYear]);

  const values = filteredTrend.map((point) => point.value);

  const chartW = 760;
  const chartH = 290;
  const chartPadX = 34;
  const chartPadY = 24;

  const points = buildPlot(values, chartW, chartH, chartPadX, chartPadY);
  const area =
    points.length > 0
      ? `${points[0]?.x},${chartH - chartPadY} ${toLine(points)} ${points[points.length - 1]?.x},${chartH - chartPadY}`
      : "";

  if (trend.length === 0) {
    return (
      <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Portfolio Trend</h2>
            <p className="text-xs text-muted">Growth across Stocks, UITF, and MP2</p>
          </div>
        </div>
        <div className="flex h-[290px] items-center justify-center text-muted">
          <p className="text-sm">No trend data available yet.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Portfolio Trend</h2>
          <p className="text-xs text-muted">Growth across Stocks, UITF, and MP2</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-xs">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`whitespace-nowrap rounded-full px-2 py-1 transition-colors ${
                range === option.id ? "bg-accent text-white" : "bg-soft-line hover:bg-line"
              }`}
              onClick={() => setRange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTrend.length === 0 ? (
        <div className="flex h-[290px] items-center justify-center text-muted">
          <p className="text-sm">No data for selected range.</p>
        </div>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto">
            <svg className="min-w-[680px]" viewBox={`0 0 ${chartW} ${chartH}`}>
              {Array.from({ length: 6 }).map((_, index) => {
                const y = chartPadY + ((chartH - chartPadY * 2) * index) / 5;
                return <line key={y} x1={chartPadX} y1={y} x2={chartW - chartPadX} y2={y} stroke="#e7eef6" strokeWidth="1" />;
              })}
              <polygon points={area} fill="rgba(23, 152, 219, 0.15)" />
              <polyline points={toLine(points)} fill="none" stroke="#1899dc" strokeWidth="3" />
              {points.map((point) => (
                <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="#1899dc" r="4" />
              ))}
            </svg>
          </div>

          <div className="mt-2 grid grid-cols-8 text-[10px] text-muted">
            {filteredTrend.map((point, index) => (
              <span key={`${point.label}-${index}`} className="text-center">
                {point.label}
              </span>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
