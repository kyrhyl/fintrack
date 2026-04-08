"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import type { ApiResponse, StockHolding } from "@/types/finance";

type StockListPayload = {
  items: StockHolding[];
  total: number;
};

type HoldingForm = {
  name: string;
  symbol: string;
  exchange: string;
  shares: string;
  averageCost: string;
  notes: string;
};

const EMPTY_FORM: HoldingForm = {
  name: "",
  symbol: "",
  exchange: "PSE",
  shares: "",
  averageCost: "",
  notes: "",
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || "Request failed.");
  }
  return body.data;
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function StockHoldingsManager() {
  const [items, setItems] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<HoldingForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stocks/holdings", { cache: "no-store" });
      const payload = await parseApiResponse<StockListPayload>(response);
      setItems(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load stock holdings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        exchange: form.exchange.trim().toUpperCase() || "PSE",
        shares: toNumber(form.shares),
        averageCost: toNumber(form.averageCost),
        notes: form.notes.trim(),
      };

      if (editingId) {
        const response = await fetch(`/api/stocks/holdings/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
      } else {
        const response = await fetch("/api/stocks/holdings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save stock holding.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this stock holding?")) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/stocks/holdings/${id}`, { method: "DELETE" });
      await parseApiResponse(response);
      if (editingId === id) {
        setForm(EMPTY_FORM);
        setEditingId(null);
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete stock holding.");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Manage Holdings</h2>
          <p className="text-xs text-muted">Stocks entered here roll up into one auto-managed Stock Portfolio asset.</p>
        </div>
      </div>

      <form className="grid gap-2 sm:grid-cols-6" onSubmit={handleSubmit}>
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:col-span-2"
          placeholder="Company name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm uppercase"
          placeholder="Symbol"
          value={form.symbol}
          onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))}
        />
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm uppercase"
          placeholder="Exchange"
          value={form.exchange}
          onChange={(event) => setForm((current) => ({ ...current, exchange: event.target.value }))}
        />
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          type="number"
          min="0"
          step="0.0001"
          placeholder="Shares"
          value={form.shares}
          onChange={(event) => setForm((current) => ({ ...current, shares: event.target.value }))}
        />
        <input
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          type="number"
          min="0"
          step="0.0001"
          placeholder="Avg cost"
          value={form.averageCost}
          onChange={(event) => setForm((current) => ({ ...current, averageCost: event.target.value }))}
        />
        <textarea
          className="min-h-16 rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:col-span-5"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
        <div className="flex items-end justify-end gap-2 sm:col-span-1">
          {editingId ? (
            <button
              className="rounded-lg border border-line px-3 py-2 text-xs"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              Cancel
            </button>
          ) : null}
          <button
            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : editingId ? "Update" : "Add Stock"}
          </button>
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 max-w-full overflow-auto">
        <table className="w-full min-w-[780px] table-auto text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
              <th className="py-2">Symbol</th>
              <th className="py-2">Name</th>
              <th className="py-2 text-right">Shares</th>
              <th className="py-2 text-right">Avg Cost</th>
              <th className="py-2 text-right">Last Price</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td className="py-4 text-muted" colSpan={6}>
                  No holdings yet. Add your first stock above.
                </td>
              </tr>
            ) : null}

            {items.map((item) => (
              <tr key={item._id} className="border-b border-line/70">
                <td className="py-3 font-semibold">{item.symbol}</td>
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-right">{item.shares.toLocaleString("en-PH")}</td>
                <td className="py-3 text-right">{item.averageCost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 text-right">{(item.lastPrice || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-line px-2 py-1 text-xs"
                      type="button"
                      onClick={() => {
                        setEditingId(item._id);
                        setForm({
                          name: item.name,
                          symbol: item.symbol,
                          exchange: item.exchange || "PSE",
                          shares: String(item.shares),
                          averageCost: String(item.averageCost || 0),
                          notes: item.notes || "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border border-line px-2 py-1 text-xs text-danger"
                      type="button"
                      onClick={() => void onDelete(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
