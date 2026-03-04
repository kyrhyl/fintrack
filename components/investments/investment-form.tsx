"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export type AssetFormPayload = {
  name: string;
  type:
    | "cash"
    | "bank_account"
    | "time_deposit"
    | "money_market"
    | "stock"
    | "etf"
    | "fund"
    | "bond"
    | "reit"
    | "retirement"
    | "cooperative"
    | "mp2"
    | "real_estate"
    | "vehicle"
    | "business_equity"
    | "receivable"
    | "crypto"
    | "precious_metal"
    | "collectible"
    | "other";
  currentValue: number;
  annualYieldPercent: number;
  monthlyIncome?: number;
  institution: string;
  isLiquid: boolean;
  acquiredAt?: string;
  notes: string;
};

export type AssetFormValue = AssetFormPayload & {
  _id: string;
  isActive: boolean;
};

type InvestmentFormProps = {
  open: boolean;
  initialValue?: AssetFormValue | null;
  onClose: () => void;
  onSubmit: (payload: AssetFormPayload) => Promise<void>;
};

type FormState = {
  name: string;
  type: AssetFormPayload["type"];
  currentValue: string;
  annualYieldPercent: string;
  monthlyIncome: string;
  institution: string;
  isLiquid: boolean;
  acquiredAt: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  type: "other",
  currentValue: "",
  annualYieldPercent: "",
  monthlyIncome: "",
  institution: "",
  isLiquid: false,
  acquiredAt: "",
  notes: "",
};

function toFormState(value?: AssetFormValue | null): FormState {
  if (!value) {
    return emptyForm;
  }

  return {
    name: value.name || "",
    type: value.type || "other",
    currentValue: `${value.currentValue ?? ""}`,
    annualYieldPercent: `${value.annualYieldPercent ?? 0}`,
    monthlyIncome: `${value.monthlyIncome ?? ""}`,
    institution: value.institution || "",
    isLiquid: Boolean(value.isLiquid),
    acquiredAt: value.acquiredAt ? new Date(value.acquiredAt).toISOString().slice(0, 10) : "",
    notes: value.notes || "",
  };
}

function toNumber(value: string, fallback = 0) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function InvestmentForm({ open, initialValue, onClose, onSubmit }: InvestmentFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setForm(toFormState(initialValue));
      setError(null);
    }
  }, [initialValue, open]);

  const autoMonthlyIncome = useMemo(() => {
    const currentValue = toNumber(form.currentValue, 0);
    const apy = toNumber(form.annualYieldPercent, 0);
    return (currentValue * apy) / 100 / 12;
  }, [form.annualYieldPercent, form.currentValue]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/35">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="panel mx-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{initialValue ? "Edit Asset" : "Add Asset"}</h3>
          <button className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            if (!form.name.trim()) {
              setError("Asset name is required.");
              return;
            }

            setSubmitting(true);
            try {
              await onSubmit({
                name: form.name.trim(),
                type: form.type,
                currentValue: toNumber(form.currentValue),
                annualYieldPercent: toNumber(form.annualYieldPercent),
                monthlyIncome: form.monthlyIncome.trim() ? toNumber(form.monthlyIncome) : undefined,
                institution: form.institution.trim(),
                isLiquid: form.isLiquid,
                acquiredAt: form.acquiredAt || undefined,
                notes: form.notes.trim(),
              });
              onClose();
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Unable to save asset.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Asset Name</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Stock Portfolio"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Type</span>
            <select
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as AssetFormPayload["type"] }))
              }
            >
              <option value="cash">Cash</option>
              <option value="bank_account">Bank Account</option>
              <option value="time_deposit">Time Deposit</option>
              <option value="money_market">Money Market</option>
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="fund">Fund</option>
              <option value="bond">Bond</option>
              <option value="reit">REIT</option>
              <option value="retirement">Retirement</option>
              <option value="cooperative">Cooperative</option>
              <option value="mp2">MP2</option>
              <option value="real_estate">Real Estate</option>
              <option value="vehicle">Vehicle</option>
              <option value="business_equity">Business Equity</option>
              <option value="receivable">Receivable</option>
              <option value="crypto">Crypto</option>
              <option value="precious_metal">Precious Metal</option>
              <option value="collectible">Collectible</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Current Value</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.currentValue}
              type="number"
              min="0"
              step="0.01"
              onChange={(event) => setForm((current) => ({ ...current, currentValue: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Annual Yield (%)</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.annualYieldPercent}
              type="number"
              min="0"
              step="0.01"
              onChange={(event) => setForm((current) => ({ ...current, annualYieldPercent: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Monthly Income (optional)</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.monthlyIncome}
              type="number"
              min="0"
              step="0.01"
              onChange={(event) => setForm((current) => ({ ...current, monthlyIncome: event.target.value }))}
            />
            <span className="text-xs text-muted">Auto estimate: {autoMonthlyIncome.toFixed(2)}</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Institution</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.institution}
              onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Acquired At</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              value={form.acquiredAt}
              type="date"
              onChange={(event) => setForm((current) => ({ ...current, acquiredAt: event.target.value }))}
            />
          </label>

          <label className="mt-6 flex items-center gap-2 text-sm">
            <input
              checked={form.isLiquid}
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, isLiquid: event.target.checked }))}
            />
            <span>Liquid asset</span>
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
            <span className="text-muted">Notes</span>
            <textarea
              className="min-h-24 rounded-lg border border-line bg-surface px-3 py-2"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>

          {error ? <p className="sm:col-span-2 text-sm text-danger">{error}</p> : null}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <button className="rounded-lg border border-line px-4 py-2 text-sm" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" disabled={submitting} type="submit">
              {submitting ? "Saving..." : initialValue ? "Save Changes" : "Create Asset"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type InvestmentFormPayload = AssetFormPayload;

export type InvestmentFormValue = AssetFormValue;
