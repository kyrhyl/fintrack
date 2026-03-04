"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatPHP } from "@/lib/data/format";

import type { ApiResponse } from "@/types/finance";

type SalaryEarning = { name: string; amount: number; isTaxable: boolean };
type SalaryDeduction = {
  name: string;
  amount: number;
  category: string;
  liabilityId?: string;
  applied?: boolean;
  appliedAt?: string;
  reconcileNote?: string;
};

type IncomeOverviewPayload = {
  month: string;
  salary: {
    id: string;
    month: string;
    grossPay: number;
    netPay: number;
    takeHomeRatio: number;
    earnings: SalaryEarning[];
    deductions: SalaryDeduction[];
    loanDeductions: SalaryDeduction[];
    notes: string;
  } | null;
  investmentInterest: Array<{ id: string; name: string; institution: string; monthlyIncome: number }>;
  streams: Array<{
    id: string;
    name: string;
    type: "active" | "passive";
    monthlyAmount: number;
    startMonth: string;
    isActive: boolean;
    notes: string;
  }>;
  liabilityOptions: Array<{ id: string; name: string; monthlyPayment: number; outstandingBalance: number }>;
  totals: {
    salaryNet: number;
    investmentInterest: number;
    otherActive: number;
    otherPassive: number;
    monthlyIncome: number;
  };
};

type SalaryFormState = {
  month: string;
  grossPay: string;
  netPay: string;
  takeHomeRatio: string;
  notes: string;
  earnings: Array<{ name: string; amount: string; isTaxable: boolean }>;
  deductions: Array<{ name: string; amount: string; category: string }>;
  loanDeductions: Array<{
    name: string;
    amount: string;
    category: string;
    liabilityId?: string;
    applied?: boolean;
    appliedAt?: string;
    reconcileNote?: string;
  }>;
};

type StreamFormState = {
  name: string;
  type: "active" | "passive";
  monthlyAmount: string;
  startMonth: string;
  notes: string;
};

const deductionCategories = ["tax", "government", "medical", "loan", "savings", "other"];

function payslipTemplate(month: string): SalaryFormState {
  return {
    month,
    grossPay: "",
    netPay: "",
    takeHomeRatio: "",
    notes: "",
    earnings: [
      { name: "Basic Pay", amount: "", isTaxable: true },
      { name: "Taxable Allowance", amount: "", isTaxable: true },
      { name: "Non-taxable Allowance", amount: "", isTaxable: false },
    ],
    deductions: [
      { name: "Withholding Tax", amount: "", category: "tax" },
      { name: "GSIS Contribution", amount: "", category: "government" },
      { name: "PhilHealth Contribution", amount: "", category: "medical" },
      { name: "PAG-IBIG Contribution", amount: "", category: "government" },
      { name: "PAG-IBIG MD2", amount: "", category: "savings" },
    ],
    loanDeductions: [{ name: "", amount: "", category: "loan" }],
  };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function defaultSalaryForm(month: string): SalaryFormState {
  return payslipTemplate(month);
}

function parseMoney(value: string) {
  const normalized = value.replace(/,/g, "").replace(/₱/g, "").trim();
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function normalizeCurrencyTyping(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) {
    return parts[0] || "";
  }
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function formatCurrencyInput(value: string | number) {
  const amount = typeof value === "number" ? Math.max(value, 0) : parseMoney(value);
  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function trimRows<T extends { name: string; amount: string }>(rows: T[]) {
  return rows
    .map((row) => ({ ...row, name: row.name.trim(), amount: row.amount.trim() }))
    .filter((row) => row.name.length > 0 || row.amount.length > 0);
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error?.message || "Request failed.");
  }
  return body.data;
}

export function IncomeManager() {
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [overview, setOverview] = useState<IncomeOverviewPayload | null>(null);
  const [salaryForm, setSalaryForm] = useState<SalaryFormState>(defaultSalaryForm(selectedMonth));
  const [loading, setLoading] = useState(true);
  const [savingSalary, setSavingSalary] = useState(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamSaving, setStreamSaving] = useState(false);
  const [editingStreamId, setEditingStreamId] = useState<string | null>(null);
  const [streamForm, setStreamForm] = useState<StreamFormState>({
    name: "",
    type: "active",
    monthlyAmount: "",
    startMonth: selectedMonth,
    notes: "",
  });

  const hydrateSalaryForm = useCallback((payload: IncomeOverviewPayload, month: string) => {
    if (!payload.salary) {
      setSalaryForm(defaultSalaryForm(month));
      return;
    }

    setSalaryForm({
      month,
      grossPay: payload.salary.grossPay ? formatCurrencyInput(payload.salary.grossPay) : "",
      netPay: payload.salary.netPay ? formatCurrencyInput(payload.salary.netPay) : "",
      takeHomeRatio: `${payload.salary.takeHomeRatio || ""}`,
      notes: payload.salary.notes || "",
      earnings: payload.salary.earnings.length > 0
        ? payload.salary.earnings.map((item) => ({
            name: item.name,
            amount: formatCurrencyInput(item.amount),
            isTaxable: item.isTaxable,
          }))
        : [{ name: "", amount: "", isTaxable: true }],
      deductions: payload.salary.deductions.length > 0
        ? payload.salary.deductions.map((item) => ({
            name: item.name,
            amount: formatCurrencyInput(item.amount),
            category: item.category,
          }))
        : [{ name: "", amount: "", category: "tax" }],
      loanDeductions: payload.salary.loanDeductions.length > 0
        ? payload.salary.loanDeductions.map((item) => ({
            name: item.name,
            amount: formatCurrencyInput(item.amount),
            category: item.category,
            liabilityId: item.liabilityId || "",
            applied: Boolean(item.applied),
            appliedAt: item.appliedAt,
            reconcileNote: item.reconcileNote || "",
          }))
        : [{ name: "", amount: "", category: "loan" }],
    });
  }, []);

  const loadOverview = useCallback(async (month: string) => {
    setLoading(true);
    setSalaryError(null);
    setStreamError(null);

    try {
      const response = await fetch(`/api/income/overview?month=${month}`, { cache: "no-store" });
      const payload = await parseApiResponse<IncomeOverviewPayload>(response);
      setOverview(payload);
      hydrateSalaryForm(payload, month);
      setStreamForm((current) => ({ ...current, startMonth: month }));
    } catch (error) {
      setSalaryError(error instanceof Error ? error.message : "Unable to load income overview.");
      setOverview(null);
      setSalaryForm(defaultSalaryForm(month));
    } finally {
      setLoading(false);
    }
  }, [hydrateSalaryForm]);

  useEffect(() => {
    void loadOverview(selectedMonth);
  }, [selectedMonth, loadOverview]);

  const earningsTotal = useMemo(
    () => trimRows(salaryForm.earnings).reduce((sum, row) => sum + parseMoney(row.amount), 0),
    [salaryForm.earnings],
  );
  const deductionsTotal = useMemo(
    () =>
      trimRows(salaryForm.deductions).reduce((sum, row) => sum + parseMoney(row.amount), 0) +
      trimRows(salaryForm.loanDeductions).reduce((sum, row) => sum + parseMoney(row.amount), 0),
    [salaryForm.deductions, salaryForm.loanDeductions],
  );
  const computedNetFromRows = useMemo(() => Math.max(earningsTotal - deductionsTotal, 0), [earningsTotal, deductionsTotal]);
  const computedTakeHome = useMemo(
    () => (earningsTotal > 0 ? (computedNetFromRows / earningsTotal) * 100 : 0),
    [earningsTotal, computedNetFromRows],
  );

  async function saveSalary() {
    setSavingSalary(true);
    setSalaryError(null);

    try {
      const earnings = trimRows(salaryForm.earnings).map((item) => ({
        name: item.name,
        amount: parseMoney(item.amount),
        isTaxable: item.isTaxable,
      }));
      const deductions = trimRows(salaryForm.deductions).map((item) => ({
        name: item.name,
        amount: parseMoney(item.amount),
        category: item.category,
      }));
      const loanDeductions = trimRows(salaryForm.loanDeductions).map((item) => ({
        name: item.name,
        amount: parseMoney(item.amount),
        category: item.category,
        liabilityId: item.liabilityId?.trim() || undefined,
      }));

      const response = await fetch("/api/salary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: salaryForm.month,
          grossPay: Number(earningsTotal.toFixed(2)),
          netPay: Number(computedNetFromRows.toFixed(2)),
          takeHomeRatio: Number(computedTakeHome.toFixed(2)),
          earnings,
          deductions,
          loanDeductions,
          notes: salaryForm.notes,
        }),
      });

      await parseApiResponse(response);
      await loadOverview(selectedMonth);
    } catch (error) {
      setSalaryError(error instanceof Error ? error.message : "Unable to save salary record.");
    } finally {
      setSavingSalary(false);
    }
  }

  function resetStreamForm(month: string) {
    setEditingStreamId(null);
    setStreamForm({ name: "", type: "active", monthlyAmount: "", startMonth: month, notes: "" });
  }

  async function submitStream() {
    setStreamSaving(true);
    setStreamError(null);

    try {
      const payload = {
        name: streamForm.name.trim(),
        type: streamForm.type,
        monthlyAmount: parseMoney(streamForm.monthlyAmount),
        startMonth: streamForm.startMonth,
        notes: streamForm.notes.trim(),
      };

      const response = await fetch(
        editingStreamId ? `/api/income-streams/${editingStreamId}` : "/api/income-streams",
        {
          method: editingStreamId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      await parseApiResponse(response);
      resetStreamForm(selectedMonth);
      await loadOverview(selectedMonth);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : "Unable to save income stream.");
    } finally {
      setStreamSaving(false);
    }
  }

  async function archiveStream(id: string) {
    setStreamError(null);
    try {
      const response = await fetch(`/api/income-streams/${id}`, { method: "DELETE" });
      await parseApiResponse(response);
      await loadOverview(selectedMonth);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : "Unable to archive income stream.");
    }
  }

  async function restoreStream(id: string) {
    setStreamError(null);
    try {
      const response = await fetch(`/api/income-streams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      await parseApiResponse(response);
      await loadOverview(selectedMonth);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : "Unable to restore income stream.");
    }
  }

  async function deleteStreamPermanently(id: string) {
    setStreamError(null);
    if (!window.confirm("Delete this income stream permanently? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/income-streams/${id}?permanent=true`, { method: "DELETE" });
      await parseApiResponse(response);
      if (editingStreamId === id) {
        resetStreamForm(selectedMonth);
      }
      await loadOverview(selectedMonth);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : "Unable to permanently delete income stream.");
    }
  }

  function setSalaryLine<K extends "earnings" | "deductions" | "loanDeductions">(
    key: K,
    index: number,
    field: string,
    value: string | boolean,
  ) {
    setSalaryForm((current) => {
      const next = [...current[key]];
      next[index] = { ...next[index], [field]: value };
      return { ...current, [key]: next } as SalaryFormState;
    });
  }

  function addSalaryRow(key: "earnings" | "deductions" | "loanDeductions") {
    setSalaryForm((current) => ({
      ...current,
      [key]: [
        ...current[key],
        key === "earnings"
          ? { name: "", amount: "", isTaxable: true }
          : { name: "", amount: "", category: key === "loanDeductions" ? "loan" : "other" },
      ],
    }));
  }

  function removeSalaryRow(key: "earnings" | "deductions" | "loanDeductions", index: number) {
    setSalaryForm((current) => {
      const next = current[key].filter((_, rowIndex) => rowIndex !== index);
      if (next.length === 0) {
        return {
          ...current,
          [key]: key === "earnings"
            ? [{ name: "", amount: "", isTaxable: true }]
            : [{ name: "", amount: "", category: key === "loanDeductions" ? "loan" : "other" }],
        } as SalaryFormState;
      }
      return { ...current, [key]: next } as SalaryFormState;
    });
  }

  return (
    <section className="grid gap-4">
      <article className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Income Overview</h2>
            <p className="text-sm text-muted">Track salary, investment interest, and recurring streams.</p>
          </div>
          <label className="text-sm">
            <span className="mr-2 text-muted">Month</span>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2"
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                const month = event.target.value;
                setSelectedMonth(month);
                setSalaryForm((current) => ({ ...current, month }));
              }}
            />
          </label>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="dashboard-kpi-card"><p className="dashboard-kpi-label">Salary Net</p><p className="dashboard-kpi-value">{formatPHP(overview?.totals.salaryNet || 0)}</p></article>
          <article className="dashboard-kpi-card"><p className="dashboard-kpi-label">Investment Interest</p><p className="dashboard-kpi-value">{formatPHP(overview?.totals.investmentInterest || 0)}</p></article>
          <article className="dashboard-kpi-card"><p className="dashboard-kpi-label">Other Active</p><p className="dashboard-kpi-value">{formatPHP(overview?.totals.otherActive || 0)}</p></article>
          <article className="dashboard-kpi-card"><p className="dashboard-kpi-label">Other Passive</p><p className="dashboard-kpi-value">{formatPHP(overview?.totals.otherPassive || 0)}</p></article>
          <article className="dashboard-kpi-card"><p className="dashboard-kpi-label">Total Monthly Income</p><p className="dashboard-kpi-value text-success">{formatPHP(overview?.totals.monthlyIncome || 0)}</p></article>
        </section>
      </article>

      <article className="panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Salary Income Stream</h3>
            <p className="text-sm text-muted">Full payslip breakdown for {selectedMonth}.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
              type="button"
              onClick={() => setSalaryForm(payslipTemplate(selectedMonth))}
            >
              Reset Template
            </button>
            <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white" type="button" disabled={savingSalary} onClick={() => void saveSalary()}>
              {savingSalary ? "Saving..." : "Save Salary"}
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-2">
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <p><span className="text-muted">Gross Pay:</span> <span className="font-semibold">{formatPHP(earningsTotal)}</span></p>
            <p><span className="text-muted">Total Deductions:</span> <span className="font-semibold">{formatPHP(deductionsTotal)}</span></p>
            <p><span className="text-muted">Net Pay:</span> <span className="font-semibold text-success">{formatPHP(computedNetFromRows)}</span></p>
            <p><span className="text-muted">Take Home Ratio:</span> <span className="font-semibold">{computedTakeHome.toFixed(1)}%</span></p>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div className="min-w-0 rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between"><h4 className="font-semibold">Earnings</h4><button className="text-xs font-semibold text-accent" type="button" onClick={() => addSalaryRow("earnings")}>+ Add Row</button></div>
            <div className="space-y-2">
              {salaryForm.earnings.map((row, index) => (
                <div key={`earning-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                  <input className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" placeholder="Name" value={row.name} onChange={(event) => setSalaryLine("earnings", index, "name", event.target.value)} />
                  <input
                    className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={row.amount}
                    onFocus={() => setSalaryLine("earnings", index, "amount", normalizeCurrencyTyping(row.amount))}
                    onBlur={() => setSalaryLine("earnings", index, "amount", row.amount ? formatCurrencyInput(row.amount) : "")}
                    onChange={(event) => setSalaryLine("earnings", index, "amount", normalizeCurrencyTyping(event.target.value))}
                  />
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <label className="flex h-9 items-center gap-1 whitespace-nowrap text-xs text-muted"><input type="checkbox" checked={row.isTaxable} onChange={(event) => setSalaryLine("earnings", index, "isTaxable", event.target.checked)} />Taxable</label>
                    <button className="h-9 rounded border border-line px-2 text-xs" type="button" onClick={() => removeSalaryRow("earnings", index)}>x</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between"><h4 className="font-semibold">Deductions</h4><button className="text-xs font-semibold text-accent" type="button" onClick={() => addSalaryRow("deductions")}>+ Add Row</button></div>
            <div className="space-y-2">
              {salaryForm.deductions.map((row, index) => (
                <div key={`deduction-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_90px_auto]">
                  <input className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" placeholder="Name" value={row.name} onChange={(event) => setSalaryLine("deductions", index, "name", event.target.value)} />
                  <input
                    className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={row.amount}
                    onFocus={() => setSalaryLine("deductions", index, "amount", normalizeCurrencyTyping(row.amount))}
                    onBlur={() => setSalaryLine("deductions", index, "amount", row.amount ? formatCurrencyInput(row.amount) : "")}
                    onChange={(event) => setSalaryLine("deductions", index, "amount", normalizeCurrencyTyping(event.target.value))}
                  />
                  <select className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs" value={row.category} onChange={(event) => setSalaryLine("deductions", index, "category", event.target.value)}>{deductionCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                  <button className="h-9 rounded border border-line px-2 text-xs" type="button" onClick={() => removeSalaryRow("deductions", index)}>x</button>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between"><h4 className="font-semibold">Loan Deductions</h4><button className="text-xs font-semibold text-accent" type="button" onClick={() => addSalaryRow("loanDeductions")}>+ Add Row</button></div>
            <div className="space-y-2">
              {salaryForm.loanDeductions.map((row, index) => (
                <div key={`loan-deduction-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_120px_minmax(0,1fr)_auto]">
                  <input className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm" placeholder="Name" value={row.name} onChange={(event) => setSalaryLine("loanDeductions", index, "name", event.target.value)} />
                  <input
                    className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={row.amount}
                    onFocus={() => setSalaryLine("loanDeductions", index, "amount", normalizeCurrencyTyping(row.amount))}
                    onBlur={() => setSalaryLine("loanDeductions", index, "amount", row.amount ? formatCurrencyInput(row.amount) : "")}
                    onChange={(event) => setSalaryLine("loanDeductions", index, "amount", normalizeCurrencyTyping(event.target.value))}
                  />
                  <select className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs" value={row.category} onChange={(event) => setSalaryLine("loanDeductions", index, "category", event.target.value)}>{deductionCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                  <select
                    className="min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
                    value={row.liabilityId || ""}
                    onChange={(event) => {
                      const liabilityId = event.target.value;
                      const linked = (overview?.liabilityOptions || []).find((item) => item.id === liabilityId);

                      if (!liabilityId || !linked) {
                        setSalaryForm((current) => {
                          const next = [...current.loanDeductions];
                          next[index] = {
                            ...next[index],
                            liabilityId: "",
                            applied: false,
                            appliedAt: undefined,
                            reconcileNote: "",
                          };
                          return { ...current, loanDeductions: next };
                        });
                        return;
                      }

                      setSalaryForm((current) => {
                        const next = [...current.loanDeductions];
                        next[index] = {
                          ...next[index],
                          name: linked.name,
                          amount: formatCurrencyInput(linked.monthlyPayment),
                          category: "loan",
                          liabilityId,
                          applied: false,
                          appliedAt: undefined,
                          reconcileNote: "",
                        };
                        return { ...current, loanDeductions: next };
                      });
                    }}
                  >
                    <option value="">Link liability (optional)</option>
                    {(overview?.liabilityOptions || []).map((item) => (
                      <option key={item.id} value={item.id}>{`${item.name} (${formatPHP(item.monthlyPayment)}/mo, bal ${formatPHP(item.outstandingBalance)})`}</option>
                    ))}
                  </select>
                  <button className="h-9 rounded border border-line px-2 text-xs" type="button" onClick={() => removeSalaryRow("loanDeductions", index)}>x</button>
                  {row.liabilityId && !row.applied && row.reconcileNote && row.reconcileNote !== "Applied to liability" ? (
                    <p className="text-xs text-warning">{row.reconcileNote}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <label className="mt-4 block text-sm"><span className="mb-1 block text-muted">Notes</span><textarea className="min-h-20 w-full rounded-lg border border-line bg-surface px-3 py-2" value={salaryForm.notes} onChange={(event) => setSalaryForm((current) => ({ ...current, notes: event.target.value }))} /></label>
        {salaryError ? <p className="mt-2 text-sm text-danger">{salaryError}</p> : null}
      </article>

      <article className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Investment Interest Income (Read-only)</h3>
            <p className="text-sm text-muted">Derived from active investment positions.</p>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">{formatPHP(overview?.totals.investmentInterest || 0)} / month</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
                <th className="py-2">Investment</th>
                <th className="py-2">Institution</th>
                <th className="py-2 text-right">Monthly Interest</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.investmentInterest || []).length === 0 ? (
                <tr><td className="py-3 text-muted" colSpan={3}>No active investment income found.</td></tr>
              ) : (
                (overview?.investmentInterest || []).map((item) => (
                  <tr key={item.id} className="border-b border-line/70">
                    <td className="py-3 font-semibold">{item.name}</td>
                    <td className="py-3 text-muted">{item.institution || "-"}</td>
                    <td className="py-3 text-right font-semibold text-success">{formatPHP(item.monthlyIncome)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel p-5">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Other Income Streams</h3>
          <p className="text-sm text-muted">Manage recurring streams outside salary and investments.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
                <th className="py-2">Name</th>
                <th className="py-2">Type</th>
                <th className="py-2">Start</th>
                <th className="py-2 text-right">Monthly</th>
                <th className="py-2 text-right">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.streams || []).length === 0 ? (
                <tr><td className="py-3 text-muted" colSpan={6}>No income streams yet.</td></tr>
              ) : (
                (overview?.streams || []).map((item) => (
                  <tr key={item.id} className="border-b border-line/70">
                    <td className="py-3"><p className="font-semibold">{item.name}</p><p className="text-xs text-muted">{item.notes || "No notes"}</p></td>
                    <td className="py-3">{item.type}</td>
                    <td className="py-3">{item.startMonth}</td>
                    <td className="py-3 text-right font-semibold">{formatPHP(item.monthlyAmount)}</td>
                    <td className="py-3 text-right">{item.isActive ? <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">Active</span> : <span className="rounded-full bg-soft-line px-2 py-1 text-xs font-semibold text-muted">Archived</span>}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="rounded border border-line px-2 py-1 text-xs" type="button" onClick={() => {
                          setEditingStreamId(item.id);
                          setStreamForm({
                            name: item.name,
                            type: item.type,
                            monthlyAmount: formatCurrencyInput(item.monthlyAmount),
                            startMonth: item.startMonth,
                            notes: item.notes,
                          });
                        }}>Edit</button>
                        {item.isActive ? (
                          <button className="rounded border border-line px-2 py-1 text-xs text-warning" type="button" onClick={() => void archiveStream(item.id)}>Archive</button>
                        ) : (
                          <button className="rounded border border-line px-2 py-1 text-xs text-success" type="button" onClick={() => void restoreStream(item.id)}>Restore</button>
                        )}
                        <button className="rounded border border-line px-2 py-1 text-xs text-danger" type="button" onClick={() => void deleteStreamPermanently(item.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-xl border border-line p-3">
          <h4 className="mb-2 font-semibold">{editingStreamId ? "Edit Income Stream" : "Add Income Stream"}</h4>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <input className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" placeholder="Name" value={streamForm.name} onChange={(event) => setStreamForm((current) => ({ ...current, name: event.target.value }))} />
            <select className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" value={streamForm.type} onChange={(event) => setStreamForm((current) => ({ ...current, type: event.target.value as "active" | "passive" }))}><option value="active">Active</option><option value="passive">Passive</option></select>
            <input
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              type="text"
              inputMode="decimal"
              placeholder="Monthly amount"
              value={streamForm.monthlyAmount}
              onFocus={() => setStreamForm((current) => ({ ...current, monthlyAmount: normalizeCurrencyTyping(current.monthlyAmount) }))}
              onBlur={() => setStreamForm((current) => ({ ...current, monthlyAmount: current.monthlyAmount ? formatCurrencyInput(current.monthlyAmount) : "" }))}
              onChange={(event) => setStreamForm((current) => ({ ...current, monthlyAmount: normalizeCurrencyTyping(event.target.value) }))}
            />
            <input className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" type="month" value={streamForm.startMonth} onChange={(event) => setStreamForm((current) => ({ ...current, startMonth: event.target.value }))} />
            <input className="rounded-lg border border-line bg-surface px-3 py-2 text-sm" placeholder="Notes" value={streamForm.notes} onChange={(event) => setStreamForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editingStreamId ? <button className="rounded border border-line px-3 py-2 text-sm" type="button" onClick={() => resetStreamForm(selectedMonth)}>Cancel</button> : null}
            <button className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white" type="button" disabled={streamSaving} onClick={() => void submitStream()}>{streamSaving ? "Saving..." : editingStreamId ? "Save Stream" : "Add Stream"}</button>
          </div>
          {streamError ? <p className="mt-2 text-sm text-danger">{streamError}</p> : null}
        </div>
      </article>

      {loading ? <p className="text-sm text-muted">Loading income data...</p> : null}
    </section>
  );
}
