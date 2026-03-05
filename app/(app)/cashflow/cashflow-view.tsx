"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { formatPHP } from "@/lib/data/format";

import type { DailyTrackingData } from "@/types/finance";

type CashflowViewProps = {
  data: DailyTrackingData;
  monthLabel: string;
};

export function CashflowView({ data, monthLabel }: CashflowViewProps) {
  const router = useRouter();
  const [date, setDate] = useState(data.date);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: data.categories[0] || "Other",
    date: data.date,
  });
  const [editingTx, setEditingTx] = useState<null | {
    id: string;
    title: string;
    amount: string;
    category: string;
    transactionDate: string;
  }>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<
    Array<{
      name: string;
      type: "fixed" | "variable" | "percentage";
      plannedAmount: number;
      percentage: number;
      recurrence: "monthly" | "quarterly" | "yearly";
    }>
  >([]);
  const [plannedIncome, setPlannedIncome] = useState(`${data.netSalary || 0}`);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "recurring">("all");
  const [filterType, setFilterType] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStart, setCustomStart] = useState(data.date);
  const [customEnd, setCustomEnd] = useState(data.date);
  const [historyTransactions, setHistoryTransactions] = useState(data.transactions);
  const [historySpending, setHistorySpending] = useState(data.todaySpending);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const disposableTone = data.disposableMonthly >= 0 ? "text-emerald-600" : "text-rose-600";
  const dailyPercent = data.dailyAllowance > 0
    ? Math.min(100, Math.round((data.todaySpending / data.dailyAllowance) * 100))
    : 0;
  const salaryNote = data.salaryMonth ? `Latest salary • ${data.salaryMonth}` : "No salary record";
  const plannedIncomeValue = Number(plannedIncome) || 0;
  const totalAllocation = categoryDraft.reduce((sum, item) => sum + (item.plannedAmount || 0), 0);
  const allocationBalance = plannedIncomeValue - totalAllocation;
  const filteredTransactions = historyTransactions.filter((tx) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesTerm = term
      ? tx.title.toLowerCase().includes(term) || tx.category.toLowerCase().includes(term)
      : true;
    const matchesSource = sourceFilter === "all" ? true : tx.source === sourceFilter;
    return matchesTerm && matchesSource;
  });
  const rangeLabel = (() => {
    if (filterType === "today") {
      return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    }
    if (filterType === "week") {
      const range = getWeekRange(date);
      return `${range.start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} - ${range.end.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;
    }
    if (filterType === "month") {
      return new Date(date).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    }
    const start = new Date(customStart).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    const end = new Date(customEnd).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    return `${start} - ${end}`;
  })();

  useEffect(() => {
    async function loadBudgetPlan() {
      try {
        const monthKey = monthKeyFromDate(date);
        const response = await fetch(`/api/budget/${monthKey}`);
        const payload = await response.json();
        const plan = payload?.data?.plan || payload?.plan || null;
        const planCategories = plan?.categories || [];

        if (planCategories.length > 0) {
          const mapped = planCategories.map((item: {
            name: string;
            type: "fixed" | "variable" | "percentage";
            plannedAmount: number;
            percentage: number;
            recurrence: "monthly" | "quarterly" | "yearly";
          }) => ({
            name: item.name,
            type: item.type,
            plannedAmount: item.plannedAmount ?? 0,
            percentage: item.percentage ?? 0,
            recurrence: item.recurrence || "monthly",
          }));
          setCategoryDraft(mapped);
          setPlannedIncome(`${plan?.plannedIncome ?? data.netSalary ?? 0}`);
          
        } else {
          const mapped = data.categories.map((category) => ({
            name: category,
            type: "fixed" as const,
            plannedAmount: 0,
            percentage: 0,
            recurrence: "monthly" as const,
          }));
          setCategoryDraft(mapped);
          setPlannedIncome(`${data.netSalary ?? 0}`);
          
        }
      } catch {
        setCategoryDraft([]);
      } finally {
      }
    }

    void loadBudgetPlan();
  }, [date, data.categories, data.netSalary]);

  useEffect(() => {
    async function loadHistory() {
      setHistoryLoading(true);
      try {
        let start: Date;
        let end: Date;

        if (filterType === "today") {
          start = new Date(date);
          start.setHours(0, 0, 0, 0);
          end = new Date(date);
          end.setHours(23, 59, 59, 999);
        } else if (filterType === "week") {
          const range = getWeekRange(date);
          start = range.start;
          end = range.end;
        } else if (filterType === "month") {
          const range = getMonthRange(date);
          start = range.start;
          end = range.end;
        } else {
          const startDate = new Date(customStart);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(customEnd);
          endDate.setHours(23, 59, 59, 999);
          start = startDate;
          end = endDate;
        }

        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
          kind: "expense",
        });
        const response = await fetch(`/api/transactions?${params.toString()}`);
        const payload = await response.json();
        const items = payload?.data?.items || payload?.items || [];

        const mapped = items.map((item: { _id: string; title: string; category: string; amount: number; kind: string; transactionDate: string; recurringExpenseId?: string; }) => ({
          id: String(item._id),
          title: item.title,
          category: item.category,
          amount: item.amount,
          kind: item.kind === "income" ? "income" : "expense",
          transactionDate: new Date(item.transactionDate).toISOString(),
          source: item.recurringExpenseId ? "recurring" : "manual",
        }));

        const total = mapped.reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);
        setHistoryTransactions(mapped);
        setHistorySpending(total);
      } catch {
        setHistoryTransactions([]);
        setHistorySpending(0);
      } finally {
        setHistoryLoading(false);
      }
    }

    void loadHistory();
  }, [filterType, date, customStart, customEnd]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!formData.title || !formData.amount) return;

    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category,
          kind: "expense",
          transactionDate: new Date(formData.date).toISOString(),
        }),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({
          title: "",
          amount: "",
          category: data.categories[0] || "Other",
          date: getDefaultExpenseDate(),
        });
        setNotice({ tone: "success", message: "Expense saved." });
        router.refresh();
      } else {
        const payload = await response.json();
        setNotice({ tone: "error", message: payload?.error?.message || "Failed to save expense." });
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setNotice({ tone: "error", message: "Failed to save expense." });
    } finally {
      setSaving(false);
    }
  }


  function monthKeyFromDate(value: string) {
    const dateObj = new Date(value);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function monthKeyAtOffset(monthKey: string, offset: number) {
    const [yearStr, monthStr] = monthKey.split("-");
    const dateObj = new Date(Number(yearStr), Number(monthStr) - 1 + offset, 1);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function getWeekRange(dateValue: string) {
    const base = new Date(dateValue);
    const day = base.getDay();
    const start = new Date(base);
    start.setDate(base.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  function getMonthRange(dateValue: string) {
    const base = new Date(dateValue);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  function getDefaultExpenseDate() {
    if (filterType === "custom") {
      return customStart;
    }
    return date;
  }

  async function openCategoryModal() {
    setShowCategoryModal(true);
    setCategoryNotice(null);

    try {
      const monthKey = monthKeyFromDate(date);
      const response = await fetch(`/api/budget/${monthKey}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Unable to load budget categories.");
      }

      const plan = payload?.data?.plan || payload?.plan || null;
      const planCategories = plan?.categories || [];

      if (planCategories.length === 0) {
        setCategoryDraft(
          data.categories.map((category) => ({
            name: category,
            type: "fixed",
            plannedAmount: 0,
            percentage: 0,
            recurrence: "monthly",
          })),
        );
      } else {
        setCategoryDraft(
          planCategories.map((item: {
            name: string;
            type: "fixed" | "variable" | "percentage";
            plannedAmount: number;
            percentage: number;
            recurrence: "monthly" | "quarterly" | "yearly";
          }) => ({
            name: item.name,
            type: item.type,
            plannedAmount: item.plannedAmount ?? 0,
            percentage: item.percentage ?? 0,
            recurrence: item.recurrence || "monthly",
          })),
        );
      }

      setPlannedIncome(`${plan?.plannedIncome ?? data.netSalary ?? 0}`);
    } catch (error) {
      setCategoryNotice(error instanceof Error ? error.message : "Unable to load categories.");
    }
  }

  async function saveCategories() {
    setCategorySaving(true);
    setCategoryNotice(null);
    try {
      const monthKey = monthKeyFromDate(date);
      const monthsToUpdate = Array.from({ length: 12 }).map((_, index) => monthKeyAtOffset(monthKey, index));
      const trimmedNames = categoryDraft
        .map((item) => item.name.trim())
        .filter(Boolean);
      const lowerNames = trimmedNames.map((name) => name.toLowerCase());
      const uniqueNames = new Set(lowerNames);
      if (uniqueNames.size !== lowerNames.length) {
        setCategoryNotice("Category names must be unique.");
        setCategorySaving(false);
        return;
      }

      const payload = {
        plannedIncome: Number(plannedIncome) || 0,
        allocationStrategy: "fixed",
        carryOverEnabled: false,
        status: "draft",
        categories: categoryDraft
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            type: item.type,
            plannedAmount: Number(item.plannedAmount) || 0,
            percentage: Number(item.percentage) || 0,
            recurrence: item.recurrence,
          })),
      };

      await Promise.all(
        monthsToUpdate.map((key) =>
          fetch(`/api/budget/${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
        ),
      );

      setShowCategoryModal(false);
      setNotice({ tone: "success", message: "Budget categories updated." });
      router.refresh();
    } catch (error) {
      setCategoryNotice(error instanceof Error ? error.message : "Unable to save categories.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    const confirmed = window.confirm("Delete this transaction? This cannot be undone.");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error?.message || "Failed to delete transaction.");
      }
      setNotice({ tone: "success", message: "Transaction deleted." });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Failed to delete transaction." });
    }
  }

  async function handleUpdateTransaction(event: React.FormEvent) {
    event.preventDefault();
    if (!editingTx) return;

    try {
      const response = await fetch(`/api/transactions/${editingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTx.title,
          amount: Number(editingTx.amount) || 0,
          category: editingTx.category,
          transactionDate: new Date(editingTx.transactionDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.error?.message || "Failed to update transaction.");
      }

      setEditingTx(null);
      setNotice({ tone: "success", message: "Transaction updated." });
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Failed to update transaction." });
    }
  }


  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Daily Tracking</h1>
          <p className="text-sm text-muted">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <button
            onClick={openCategoryModal}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-foreground"
            type="button"
          >
            Categories
          </button>
          <button
            onClick={() => {
              setFormData((current) => ({
                ...current,
                date: getDefaultExpenseDate(),
              }));
              setShowForm(true);
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            type="button"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Net Salary</p>
          <p className="mt-2 text-2xl font-semibold">{formatPHP(data.netSalary)}</p>
          <p className="mt-1 text-xs text-muted">{salaryNote}</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Recurring Debts</p>
          <p className="mt-2 text-2xl font-semibold">{formatPHP(data.recurringDebtsTotal)}</p>
          <p className="mt-1 text-xs text-muted">Monthly debt commitments</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Budgeted Total</p>
          <p className="mt-2 text-2xl font-semibold">{formatPHP(data.budgetedTotal)}</p>
          <p className="mt-1 text-xs text-muted">Planned categories this month</p>
        </article>
        <article className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Disposable</p>
            <span
              className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-muted"
              title="Disposable = Net Salary - Recurring Debts - Budget Total"
            >
              Formula
            </span>
          </div>
          <p className={`mt-2 text-2xl font-semibold ${disposableTone}`}>{formatPHP(data.disposableMonthly)}</p>
          <p className="mt-1 text-xs text-muted">Net salary minus debts &amp; budget</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Daily Allowance</p>
                <p className="text-xs text-muted">
                  {data.daysRemaining} day{data.daysRemaining === 1 ? "" : "s"} left • based on net salary
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Today&apos;s spend</p>
                <p className="text-lg font-semibold">{formatPHP(data.todaySpending)}</p>
              </div>
            </div>
            <div className="mt-4 rounded-full bg-soft-line">
              <div
                className={`h-2 rounded-full ${data.dailyAllowance > 0 ? "bg-accent" : "bg-muted"}`}
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Daily allowance: {formatPHP(data.dailyAllowance)}</span>
              <span>{dailyPercent}% used today</span>
            </div>
            {data.disposableMonthly <= 0 ? (
              <p className="mt-3 text-xs text-rose-600">Disposable income is below zero. Review budget allocations.</p>
            ) : null}
          </article>

          <article className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Last 7 Days</h2>
              <span className="text-xs text-muted">Expenses</span>
            </div>
            {data.weeklySpending.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No recent spending data.</p>
            ) : (
              <div className="mt-4 grid grid-cols-7 gap-2 items-end">
                {data.weeklySpending.map((point) => {
                  const max = Math.max(...data.weeklySpending.map((p) => p.amount), 1);
                  const height = Math.max(12, Math.round((point.amount / max) * 96));
                  return (
                    <div key={point.date} className="flex flex-col items-center gap-2">
                      <div className="w-7 rounded-lg bg-accent/20">
                        <div className="rounded-lg bg-accent" style={{ height }} />
                      </div>
                      <span className="text-[11px] text-muted">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Transaction History</h2>
                <span className="text-xs text-muted">{rangeLabel}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{filteredTransactions.length} item(s)</p>
                <p className="text-xs text-muted">Range spend: {formatPHP(historySpending)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="flex flex-wrap gap-2">
                {(["today", "week", "month", "custom"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      filterType === option ? "border-accent bg-accent/10 text-accent" : "border-line text-muted"
                    }`}
                    onClick={() => setFilterType(option)}
                  >
                    {option === "today" ? "Today" : option === "week" ? "Week" : option === "month" ? "Month" : "Custom"}
                  </button>
                ))}
              </div>
              {filterType === "custom" ? (
                <div className="flex flex-wrap gap-2">
                  <input
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                  <input
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm sm:w-64"
                placeholder="Search title or category"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as "all" | "manual" | "recurring")}
              >
                <option value="all">All sources</option>
                <option value="manual">Manual</option>
                <option value="recurring">Recurring</option>
              </select>
            </div>
            {historyLoading ? (
              <p className="mt-4 text-sm text-muted">Loading transactions...</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No transactions for the selected range.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {filteredTransactions.map((tx) => (
                  <li key={tx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-background p-3">
                    <div>
                      <p className="font-medium">{tx.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{tx.category}</span>
                        <span className="h-1 w-1 rounded-full bg-muted" />
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            tx.source === "recurring" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {tx.source === "recurring" ? "Recurring" : "Manual"}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-muted" />
                        <span>{new Date(tx.transactionDate).toLocaleDateString("en-PH")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">-{formatPHP(tx.amount)}</p>
                      <button
                        className="text-xs font-semibold text-accent"
                        type="button"
                        onClick={() =>
                          setEditingTx({
                            id: tx.id,
                            title: tx.title,
                            amount: `${tx.amount}`,
                            category: tx.category,
                            transactionDate: new Date(tx.transactionDate).toISOString().slice(0, 10),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-semibold text-rose-600"
                        type="button"
                        onClick={() => handleDeleteTransaction(tx.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Monthly Budget Progress</h2>
                <span className="text-xs text-muted">{formatPHP(data.monthSpending)} spent</span>
              </div>
              <button
                className="text-xs font-semibold text-accent"
                type="button"
                onClick={openCategoryModal}
              >
                Edit Budget
              </button>
            </div>
            {data.budgetProgress.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No budget set for this month. Create a budget plan to track progress.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.budgetProgress.map((item) => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted">
                        {formatPHP(item.actual)} / {formatPHP(item.planned)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-soft-line">
                      <div
                        className={`h-full rounded-full ${
                          item.percentUsed > 100 ? "bg-danger" : item.percentUsed > 80 ? "bg-warning" : "bg-accent"
                        }`}
                        style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {item.percentUsed}% used • {formatPHP(item.remaining)} remaining
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">Recurring Debts</h2>
            {data.recurringDebts.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No active liabilities recorded.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.recurringDebts.map((debt) => (
                  <li key={debt.id} className="flex items-center justify-between rounded-xl border border-line bg-background p-3">
                    <div>
                      <p className="font-medium">{debt.name}</p>
                      <p className="text-xs text-muted">
                        {debt.category} • {debt.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPHP(debt.monthlyPayment)}</p>
                      <p className="text-xs text-muted">Bal {formatPHP(debt.outstandingBalance)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold">Upcoming Bills</h2>
            {data.upcomingBills.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No recurring bills scheduled.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {data.upcomingBills.map((bill) => (
                  <li key={bill.id} className="flex items-center justify-between rounded-xl border border-line bg-background p-3">
                    <div>
                      <p className="font-medium">{bill.name}</p>
                      <p className="text-xs text-muted">
                        {bill.category} • {bill.recurrenceRule}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPHP(bill.amount)}</p>
                      <p className="text-xs text-muted">
                        Due {bill.nextDueDate ? new Date(bill.nextDueDate).toLocaleDateString("en-PH") : "TBD"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-50 bg-slate-900/35">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="panel w-full max-w-lg p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Expense</h3>
                <button
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">What did you spend on?</span>
                  <input
                    type="text"
                    placeholder="Groceries, Utilities, Rent"
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted">Amount</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
                      className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                      step="0.01"
                      min="0"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted">Date</span>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                      className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted">Category</span>
                    <select
                      value={formData.category}
                      onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                      className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    >
                      {data.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-line px-4 py-2 text-sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {showCategoryModal ? (
        <div className="fixed inset-0 z-50 bg-slate-900/35">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="panel w-full max-w-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Edit Budget</h3>
                  <p className="text-xs text-muted">Applies to this month and the next 12 months.</p>
                </div>
                <button
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  onClick={() => setShowCategoryModal(false)}
                  type="button"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Planned Income (read-only)</span>
                  <input
                    type="number"
                    value={plannedIncome}
                    readOnly
                    className="rounded-lg border border-line bg-soft-line px-3 py-2 text-sm text-muted"
                  />
                </label>
                <div className="flex flex-col justify-end gap-1 text-sm">
                  <span className="text-muted">Total Allocation</span>
                  <span className="text-base font-semibold">{formatPHP(totalAllocation)}</span>
                  <span className={`text-xs ${allocationBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    Balance: {formatPHP(allocationBalance)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {categoryDraft.length === 0 ? (
                  <p className="text-sm text-muted">No categories yet. Add one below.</p>
                ) : (
                  categoryDraft.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="grid gap-2 rounded-xl border border-line bg-background p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                      <input
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                        value={item.name}
                        onChange={(event) =>
                          setCategoryDraft((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, name: event.target.value } : row,
                            ),
                          )
                        }
                        placeholder="Category name"
                      />
                      <input
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                        value={item.plannedAmount}
                        onChange={(event) =>
                          setCategoryDraft((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, plannedAmount: Number(event.target.value) || 0 }
                                : row,
                            ),
                          )
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Allocation"
                      />
                      <select
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                        value={item.type}
                        onChange={(event) =>
                          setCategoryDraft((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, type: event.target.value as "fixed" | "variable" | "percentage" } : row,
                            ),
                          )
                        }
                      >
                        <option value="fixed">Fixed</option>
                        <option value="variable">Variable</option>
                        <option value="percentage">Percentage</option>
                      </select>
                      <select
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                        value={item.recurrence}
                        onChange={(event) =>
                          setCategoryDraft((current) =>
                            current.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, recurrence: event.target.value as "monthly" | "quarterly" | "yearly" } : row,
                            ),
                          )
                        }
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <button
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600"
                        type="button"
                        onClick={() =>
                          setCategoryDraft((current) => current.filter((_, rowIndex) => rowIndex !== index))
                        }
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className="mt-4 rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                type="button"
                onClick={() =>
                  setCategoryDraft((current) => [
                    ...current,
                    {
                      name: "",
                      type: "fixed",
                      plannedAmount: 0,
                      percentage: 0,
                      recurrence: "monthly",
                    },
                  ])
                }
              >
                + Add Category
              </button>

              {categoryNotice ? <p className="mt-3 text-sm text-rose-600">{categoryNotice}</p> : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  className="rounded-lg border border-line px-4 py-2 text-sm"
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </button>
              <button
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                type="button"
                onClick={saveCategories}
                disabled={categorySaving}
              >
                {categorySaving ? "Saving..." : "Save Budget"}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingTx ? (
        <div className="fixed inset-0 z-50 bg-slate-900/35">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="panel w-full max-w-lg p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Transaction</h3>
                <button
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  onClick={() => setEditingTx(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <form onSubmit={handleUpdateTransaction} className="grid gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Title</span>
                  <input
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    value={editingTx.title}
                    onChange={(event) => setEditingTx({ ...editingTx, title: event.target.value })}
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted">Amount</span>
                    <input
                      className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                      value={editingTx.amount}
                      onChange={(event) => setEditingTx({ ...editingTx, amount: event.target.value })}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-muted">Category</span>
                    <select
                      className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                      value={editingTx.category}
                      onChange={(event) => setEditingTx({ ...editingTx, category: event.target.value })}
                    >
                      {data.categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted">Date</span>
                  <input
                    className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                    type="date"
                    value={editingTx.transactionDate}
                    onChange={(event) => setEditingTx({ ...editingTx, transactionDate: event.target.value })}
                    required
                  />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded-lg border border-line px-4 py-2 text-sm"
                    onClick={() => setEditingTx(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
