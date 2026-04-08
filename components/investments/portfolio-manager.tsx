"use client";

import { useCallback, useEffect, useState } from "react";

import { formatPHP } from "@/lib/data/format";
import { isStockPortfolioAggregateAsset } from "@/lib/stocks/constants";
import { InvestmentForm, type AssetFormPayload, type AssetFormValue } from "@/components/investments/investment-form";

import type { ApiResponse } from "@/types/finance";

type AssetListPayload = {
  items: AssetFormValue[];
  total: number;
  page: number;
  limit: number;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || "Request failed.");
  }

  return body.data;
}

function resolveMonthlyIncome(item: AssetFormValue) {
  if (typeof item.monthlyIncome === "number" && item.monthlyIncome > 0) {
    return item.monthlyIncome;
  }

  if ((item.annualYieldPercent || 0) <= 0) {
    return Math.max(item.monthlyIncome || 0, 0);
  }

  return ((item.currentValue || 0) * (item.annualYieldPercent || 0)) / 100 / 12;
}

export function PortfolioManager() {
  const [items, setItems] = useState<AssetFormValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetFormValue | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      const response = await fetch(`/api/assets?${params.toString()}`, { cache: "no-store" });
      const payload = await parseApiResponse<AssetListPayload>(response);
      setItems(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assets.");
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async (payload: AssetFormPayload) => {
    const response = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await parseApiResponse(response);
    await load();
  };

  const onUpdate = async (id: string, payload: AssetFormPayload) => {
    const response = await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    await parseApiResponse(response);
    await load();
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this asset? This cannot be undone.")) {
      return;
    }

    const response = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    await parseApiResponse(response);
    await load();
  };

  return (
    <section className="panel stagger w-full min-w-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">My Assets</h2>
          <p className="text-sm text-muted">Editable source of truth for your assets. Stock details are managed in Stock Portfolio.</p>
        </div>
        <button
          className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          type="button"
        >
          + Add Asset
        </button>
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap gap-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          placeholder="Search by name or institution"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">All Types</option>
          <option value="stock">Stock Portfolio (auto)</option>
          <option value="fund">Fund</option>
          <option value="bond">Bond</option>
          <option value="etf">ETF</option>
          <option value="reit">REIT</option>
          <option value="retirement">Retirement</option>
          <option value="cooperative">Cooperative</option>
          <option value="mp2">MP2</option>
          <option value="cash">Cash</option>
          <option value="bank_account">Bank Account</option>
          <option value="time_deposit">Time Deposit</option>
          <option value="money_market">Money Market</option>
          <option value="real_estate">Real Estate</option>
          <option value="vehicle">Vehicle</option>
          <option value="business_equity">Business Equity</option>
          <option value="receivable">Receivable</option>
          <option value="crypto">Crypto</option>
          <option value="precious_metal">Precious Metal</option>
          <option value="collectible">Collectible</option>
          <option value="other">Other</option>
        </select>
        <div className="flex items-center rounded-xl border border-line px-3 py-2 text-sm text-muted">
          Hard delete mode
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 max-w-full overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
              <th className="py-2">Asset</th>
              <th className="py-2 text-right">Current Value</th>
              <th className="py-2 text-right">Yield</th>
              <th className="py-2 text-right">Monthly</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td className="py-4 text-muted" colSpan={5}>
                  No assets found for this filter.
                </td>
              </tr>
            ) : null}

            {items.map((item) => {
              const managedStock = isStockPortfolioAggregateAsset(item);

              return (
              <tr key={item._id} className="border-b border-line/70">
                <td className="py-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {managedStock ? "Managed from Stock Portfolio" : item.institution || "No institution"}
                  </p>
                </td>
                <td className="py-3 text-right font-semibold">{formatPHP(item.currentValue)}</td>
                <td className="py-3 text-right">{item.annualYieldPercent}%</td>
                <td className="py-3 text-right text-success">{formatPHP(resolveMonthlyIncome(item))}</td>
                <td className="py-3 text-right">
                  {managedStock ? (
                    <span className="text-xs text-muted">Manage in /stock-portfolio</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-lg border border-line px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-line px-2 py-1 text-xs text-danger"
                        onClick={() => void onDelete(item._id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InvestmentForm
        open={formOpen}
        initialValue={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={async (payload) => {
          if (editing) {
            await onUpdate(editing._id, payload);
          } else {
            await onCreate(payload);
          }
        }}
      />
    </section>
  );
}
