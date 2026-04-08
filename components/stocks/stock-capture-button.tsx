"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiResponse, StockCaptureResult } from "@/types/finance";

export function StockCaptureButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function captureMonthly() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/stocks/capture-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json()) as ApiResponse<StockCaptureResult>;

      if (!response.ok || !body.success || !body.data) {
        throw new Error(body.error?.message || "Failed to capture monthly stock data.");
      }

      const failureNote = body.data.failedSymbols.length > 0 ? `, ${body.data.failedSymbols.length} failed` : "";
      setStatus(`Captured ${body.data.capturedCount} position(s) for ${body.data.month}${failureNote}. Assets total synced.`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to capture monthly stock data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={() => void captureMonthly()}
        type="button"
      >
        {loading ? "Capturing..." : "Capture Monthly Snapshot"}
      </button>
      {status ? <p className="text-xs text-muted">{status}</p> : null}
    </div>
  );
}
