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

const AXIS_STEP = 500_000;
const MIN_AXIS_TICKS = 6;

function ceilToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function floorToStep(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function buildPlot(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  minBound?: number,
  maxBound?: number,
): PlotPoint[] {
  const max = maxBound ?? Math.max(...values);
  const min = minBound ?? Math.min(...values);
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

function trimTrailingZeros(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatWithCommas(value: number, decimals: number) {
  const fixed = value.toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (!fraction) {
    return groupedWhole;
  }
  return `${groupedWhole}.${fraction}`;
}

function formatAxisValue(value: number, valueRange: number) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (valueRange <= 10_000) {
    return `${sign}₱${formatWithCommas(absValue, 0)}`;
  }

  if (absValue >= 1_000_000) {
    const decimals = valueRange < 100_000 ? 2 : 1;
    const compact = trimTrailingZeros((absValue / 1_000_000).toFixed(decimals));
    return `${sign}₱${compact}M`;
  }

  if (absValue >= 1_000) {
    const compact = trimTrailingZeros((absValue / 1_000).toFixed(1));
    return `${sign}₱${compact}K`;
  }

  return `${sign}₱${formatWithCommas(absValue, 0)}`;
}

const RANGE_OPTIONS = [
  { id: "1m", label: "1M" },
  { id: "ytd", label: "YTD" },
  { id: "all", label: "ALL" },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]["id"];

export function PortfolioTrendChart({ trend }: PortfolioTrendChartProps) {
  const [range, setRange] = useState<RangeId>("ytd");

  const latestLabelYear = trend.length > 0 ? trend[trend.length - 1]?.label.split("/")[1] || "" : "";

  const filteredTrend = useMemo(() => {
    if (trend.length === 0) return [];

    switch (range) {
      case "1m": {
        const lastTwo = trend.slice(-2);
        return lastTwo.length > 0 ? lastTwo : trend;
      }
      case "ytd": {
        return trend.filter((point) => (point.label.split("/")[1] || "") === latestLabelYear);
      }
      case "all":
      default:
        return trend;
    }
  }, [trend, range, latestLabelYear]);

  const values = filteredTrend.map((point) => point.value);
  const rawMaxValue = values.length > 0 ? Math.max(...values) : 0;
  const rawMinValue = values.length > 0 ? Math.min(...values) : 0;
  let maxValue = ceilToStep(rawMaxValue, AXIS_STEP);
  let minValue = floorToStep(rawMinValue, AXIS_STEP);

  if (maxValue === minValue) {
    maxValue += AXIS_STEP * 2;
    minValue -= AXIS_STEP * 2;
  }

  const requiredSpan = (MIN_AXIS_TICKS - 1) * AXIS_STEP;
  const currentSpan = maxValue - minValue;
  if (currentSpan < requiredSpan) {
    const missingSteps = Math.ceil((requiredSpan - currentSpan) / AXIS_STEP);
    const addTopSteps = Math.ceil(missingSteps / 2);
    const addBottomSteps = Math.floor(missingSteps / 2);
    maxValue += addTopSteps * AXIS_STEP;
    minValue -= addBottomSteps * AXIS_STEP;
  }

  const valueRange = Math.max(maxValue - minValue, 1);
  const tickCount = Math.max(MIN_AXIS_TICKS, Math.round(valueRange / AXIS_STEP) + 1);
  const axisTicks = Array.from({ length: tickCount }).map((_, index) => {
    const value = maxValue - index * AXIS_STEP;
    return {
      value,
      label: formatAxisValue(value, valueRange),
    };
  });

  const chartW = 760;
  const chartH = 290;
  const chartPadX = 86;
  const chartPadY = 24;

  const points = buildPlot(values, chartW, chartH, chartPadX, chartPadY, minValue, maxValue);
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
            <p className="text-xs text-muted">Monthly market value trend from stock snapshots</p>
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
          <p className="text-xs text-muted">Monthly market value trend from stock snapshots</p>
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
              {axisTicks.map((tick, index) => {
                const y = chartPadY + ((chartH - chartPadY * 2) * index) / Math.max(axisTicks.length - 1, 1);
                return (
                  <g key={y}>
                    <line x1={chartPadX} y1={y} x2={chartW - chartPadX} y2={y} stroke="#e7eef6" strokeWidth="1" />
                    <text x={chartPadX - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#7d8da1">
                      {tick.label}
                    </text>
                  </g>
                );
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
