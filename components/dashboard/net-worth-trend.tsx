"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatPHP } from "@/lib/data/format";

import type { NetWorthTrendData } from "@/types/finance";

type NetWorthTrendProps = {
  trend: NetWorthTrendData;
};

type Point = { x: number; y: number };

function buildPlot(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  min: number,
  max: number,
) {
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

function formatCompactPHP(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function NetWorthTrend({ trend }: NetWorthTrendProps) {
  const router = useRouter();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function handleCapture() {
    setIsCapturing(true);
    setCaptureError(null);

    try {
      const response = await fetch("/api/net-worth/capture", { method: "POST" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error?.message || "Capture failed";
        throw new Error(message);
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to capture right now.";
      setCaptureError(message);
    } finally {
      setIsCapturing(false);
    }
  }

  if (trend.points.length === 0 || !trend.latest) {
    return (
      <article className="dashboard-mini-card md:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Monthly Net Worth Trend</p>
          <button
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
            type="button"
            onClick={handleCapture}
            disabled={isCapturing}
          >
            {isCapturing ? "Capturing..." : "Capture Net Worth"}
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">No snapshots yet. Capture your net worth to start the trend.</p>
        {captureError ? <p className="mt-2 text-xs text-danger">{captureError}</p> : null}
      </article>
    );
  }

  const netWorthValues = trend.points.map((point) => point.value);
  const assetsValues = trend.points.map((point) => point.assetsTotal);
  const liabilitiesValues = trend.points.map((point) => point.liabilitiesTotal);
  const allSeriesValues = [...netWorthValues, ...assetsValues, ...liabilitiesValues];
  const chartW = 760;
  const chartH = 180;
  const chartPadX = 52;
  const chartPadY = 18;
  const maxValue = Math.max(...allSeriesValues);
  const minValue = Math.min(...allSeriesValues);
  const range = Math.max(maxValue - minValue, 1);
  const netWorthPoints = buildPlot(netWorthValues, chartW, chartH, chartPadX, chartPadY, minValue, maxValue);
  const assetsPoints = buildPlot(assetsValues, chartW, chartH, chartPadX, chartPadY, minValue, maxValue);
  const liabilitiesPoints = buildPlot(liabilitiesValues, chartW, chartH, chartPadX, chartPadY, minValue, maxValue);
  const netWorthLine = toLine(netWorthPoints);
  const assetsLine = toLine(assetsPoints);
  const liabilitiesLine = toLine(liabilitiesPoints);
  const area = `${netWorthPoints[0]?.x},${chartH - chartPadY} ${netWorthLine} ${netWorthPoints[netWorthPoints.length - 1]?.x},${chartH - chartPadY}`;
  const deltaTone = trend.delta >= 0 ? "text-success" : "text-danger";
  const deltaSign = trend.delta >= 0 ? "+" : "";
  const assetsDelta = trend.previous ? trend.latest.assetsTotal - trend.previous.assetsTotal : 0;
  const assetsDeltaTone = assetsDelta >= 0 ? "text-success" : "text-danger";
  const assetsDeltaSign = assetsDelta >= 0 ? "+" : "";
  const liabilitiesDelta = trend.previous ? trend.latest.liabilitiesTotal - trend.previous.liabilitiesTotal : 0;
  const liabilitiesImprovement = trend.previous ? trend.previous.liabilitiesTotal - trend.latest.liabilitiesTotal : 0;
  const liabilitiesImprovementTone = liabilitiesImprovement >= 0 ? "text-success" : "text-danger";
  const liabilitiesDeltaSign = liabilitiesDelta >= 0 ? "+" : "";
  const liabilitiesImprovementSign = liabilitiesImprovement >= 0 ? "+" : "";

  return (
    <article className="dashboard-mini-card md:col-span-3">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Monthly Net Worth Trend</p>
          <p className="text-xs text-muted">Manual captures only</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">{formatPHP(trend.latest.value)}</p>
          <p className={`text-xs font-semibold ${deltaTone}`}>
            {`${deltaSign}${formatPHP(Math.abs(trend.delta))} (${deltaSign}${Math.abs(trend.deltaPercent).toFixed(2)}%) vs previous capture`}
          </p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted">
          {trend.latest.capturedAt
            ? `Last captured ${new Date(trend.latest.capturedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })}`
            : ""}
        </div>
        <button
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
          type="button"
          onClick={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing ? "Capturing..." : "Capture Net Worth"}
        </button>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-soft-line/30 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Total Assets</p>
          <p className="mt-1 text-lg font-semibold">{formatPHP(trend.latest.assetsTotal)}</p>
          <p className={`mt-1 text-xs font-semibold ${assetsDeltaTone}`}>
            {trend.previous
              ? `${assetsDeltaSign}${formatPHP(Math.abs(assetsDelta))} vs previous capture`
              : "No previous capture yet"}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-soft-line/30 p-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted">Total Liabilities</p>
          <p className="mt-1 text-lg font-semibold">{formatPHP(trend.latest.liabilitiesTotal)}</p>
          <p className={`mt-1 text-xs font-semibold ${liabilitiesImprovementTone}`}>
            {trend.previous
              ? `${liabilitiesImprovementSign}${formatPHP(Math.abs(liabilitiesImprovement))} improvement (${liabilitiesDeltaSign}${formatPHP(Math.abs(liabilitiesDelta))} raw delta)`
              : "No previous capture yet"}
          </p>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#1899dc]" />Net Worth</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#10b981]" />Assets</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ef4444]" />Liabilities</span>
      </div>

      <div className="overflow-x-auto">
        <svg className="min-w-[680px]" viewBox={`0 0 ${chartW} ${chartH}`}>
          {Array.from({ length: 4 }).map((_, index) => {
            const y = chartPadY + ((chartH - chartPadY * 2) * index) / 3;
            const value = maxValue - (range * index) / 3;
            return (
              <g key={y}>
                <line
                  x1={chartPadX}
                  y1={y}
                  x2={chartW - chartPadX}
                  y2={y}
                  stroke="#e7eef6"
                  strokeWidth="1"
                />
                <text x={6} y={y + 3} fill="#8da0b5" fontSize="10">
                  {formatCompactPHP(value)}
                </text>
              </g>
            );
          })}
          <polygon points={area} fill="rgba(23, 152, 219, 0.14)" />
          <polyline points={assetsLine} fill="none" stroke="#10b981" strokeWidth="2.5" />
          <polyline points={liabilitiesLine} fill="none" stroke="#ef4444" strokeWidth="2.5" />
          <polyline points={netWorthLine} fill="none" stroke="#1899dc" strokeWidth="3" />
          {netWorthPoints.map((point) => (
            <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} fill="#1899dc" r="3.8" />
          ))}
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] text-muted md:grid-cols-12">
        {trend.points.map((point, index) => (
          <span key={`${point.month}-${index}`} className="text-center">
            {point.label}
          </span>
        ))}
      </div>
      {captureError ? <p className="mt-2 text-xs text-danger">{captureError}</p> : null}
    </article>
  );
}
