"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { formatPHP } from "@/lib/data/format";
import { OPEN_LIABILITY_CREATE_EVENT } from "@/lib/events";

import type { DebtsData } from "@/types/finance";

type DebtsTableProps = {
  loans: DebtsData["loans"];
  showControls?: boolean;
};

type LiabilityStatus = "newly opened" | "on track" | "halfway there" | "closed";

type LiabilityForm = {
  name: string;
  dateIncurred: string;
  monthlyAmortization: string;
  termMonths: string;
  status: LiabilityStatus;
};

type StatusFilter = "active" | "all" | LiabilityStatus;

const statusOptions: LiabilityStatus[] = ["newly opened", "on track", "halfway there", "closed"];

const emptyForm: LiabilityForm = {
  name: "",
  dateIncurred: new Date().toISOString().slice(0, 10),
  monthlyAmortization: "",
  termMonths: "",
  status: "on track",
};

function toErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybeEnvelope = payload as { error?: { message?: string } };
  return maybeEnvelope.error?.message || fallback;
}

function monthDiff(fromIsoDate: string, now = new Date()) {
  const start = new Date(`${fromIsoDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }
  const years = now.getUTCFullYear() - start.getUTCFullYear();
  const months = now.getUTCMonth() - start.getUTCMonth();
  return Math.max(0, years * 12 + months + 1);
}
export function DebtsTable({ loans, showControls = true }: DebtsTableProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [statusDraftFilter, setStatusDraftFilter] = useState<StatusFilter>("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LiabilityForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const tableLoans = loans;

  const hasPersistedItems = useMemo(() => tableLoans.some((loan) => Boolean(loan.id)), [tableLoans]);
  const hasAnyLoans = tableLoans.length > 0;

  const filteredLoans = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tableLoans.filter((loan) => {
      const isClosed = loan.status.toLowerCase() === "closed" || loan.isActive === false;
      const matchesSearch =
        keyword.length === 0 || loan.name.toLowerCase().includes(keyword) || loan.status.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" && !isClosed)
        || (statusFilter === "closed" && isClosed)
        || loan.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tableLoans]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pagedLoans = filteredLoans.slice(pageStart, pageEnd);

  useEffect(() => {
    function onOpenCreate() {
      setEditingId(null);
      setForm(emptyForm);
      setErrorMessage(null);
      setIsOpen(true);
    }

    window.addEventListener(OPEN_LIABILITY_CREATE_EVENT, onOpenCreate);
    return () => window.removeEventListener(OPEN_LIABILITY_CREATE_EVENT, onOpenCreate);
  }, []);

  function closeModal() {
    setIsOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrorMessage(null);
    setIsSaving(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrorMessage(null);
    setIsOpen(true);
  }

  function openEdit(loan: DebtsData["loans"][number]) {
    if (!loan.id) {
      return;
    }

    setEditingId(loan.id);
    setForm({
      name: loan.name,
      dateIncurred: (loan.dateIncurred || new Date().toISOString()).slice(0, 10),
      monthlyAmortization: String(loan.monthly),
      termMonths: String(loan.termMonths || ""),
      status: (statusOptions.includes(loan.status as LiabilityStatus) ? loan.status : "on track") as LiabilityStatus,
    });
    setErrorMessage(null);
    setIsOpen(true);
  }

  async function handleDelete(id?: string) {
    if (!id || !window.confirm("Delete this liability permanently?")) {
      return;
    }

    setErrorMessage(null);
    const response = await fetch(`/api/liabilities/${id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setErrorMessage(toErrorMessage(payload, "Unable to delete liability."));
      return;
    }

    if (editingId === id) {
      closeModal();
    }

    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage(null);

    const monthlyAmortization = Number(form.monthlyAmortization || 0);
    const termMonths = Number(form.termMonths || 0);

    if (!form.dateIncurred || !Number.isFinite(monthlyAmortization) || monthlyAmortization <= 0 || !Number.isFinite(termMonths) || termMonths <= 0) {
      setErrorMessage("Provide a valid incurred date, monthly amortization, and monthly period.");
      setIsSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name,
      dateIncurred: form.dateIncurred,
      monthlyAmortization,
      termMonths,
      status: form.status,
    };

    const isEditing = Boolean(editingId);

    if (!isEditing) {
      body.category = "loan";
    }

    const url = isEditing ? `/api/liabilities/${editingId}` : "/api/liabilities";
    const method = isEditing ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setErrorMessage(toErrorMessage(payload, "Unable to save liability."));
      setIsSaving(false);
      return;
    }

    closeModal();
    router.refresh();
  }

  async function toggleCurrentMonthPaid(loan: DebtsData["loans"][number], paid: boolean) {
    if (!loan.id) {
      setErrorMessage("Unable to identify liability for payment update.");
      return;
    }

    setUpdatingPaymentId(loan.id);
    setErrorMessage(null);

    const response = await fetch(`/api/liabilities/${loan.id}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setErrorMessage(toErrorMessage(payload, "Unable to update this month's payment status."));
      setUpdatingPaymentId(null);
      return;
    }

    setUpdatingPaymentId(null);
    router.refresh();
  }

  function getTimeline(loan: DebtsData["loans"][number]) {
    const totalMonths = Math.max(loan.termMonths || 0, 1);
    const paidMonths = Math.round((loan.progress / 100) * totalMonths);
    const startedMonth = loan.dateIncurred ? new Date(loan.dateIncurred) : new Date();
    return {
      totalMonths,
      paidMonths,
      startedLabel: startedMonth.toLocaleString("en-US", { month: "short", year: "numeric" }),
    };
  }

  function statusBadgeClass(status: string) {
    const normalized = status.toLowerCase();
    if (normalized.includes("new")) {
      return "bg-[#fff3d4] text-[#d78205]";
    }
    if (normalized.includes("half")) {
      return "bg-[#dff8e9] text-[#17914f]";
    }
    if (normalized.includes("track")) {
      return "bg-[#def7e8] text-[#168c4e]";
    }
    return "bg-accent-soft text-accent";
  }

  const formPreview = useMemo(() => {
    const monthly = Number(form.monthlyAmortization || 0);
    const period = Number(form.termMonths || 0);
    const totalDebt = Number.isFinite(monthly) && Number.isFinite(period) ? monthly * period : 0;
    const dueInstallments = form.dateIncurred ? Math.min(period, monthDiff(form.dateIncurred)) : 0;
    const outstanding = Math.max(0, totalDebt - dueInstallments * monthly);
    return {
      totalDebt,
      dueInstallments,
      outstanding,
    };
  }, [form.dateIncurred, form.monthlyAmortization, form.termMonths]);

  return (
    <>
      {showControls ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted">
            {hasPersistedItems
              ? "Use + New Liability in the page header to add records. Edit and payment actions are available per row."
              : "Use + New Liability in the page header to add your first record. Rows without a saved id are view-only."}
          </p>
        </div>
      ) : null}

      {errorMessage ? <p className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p> : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-soft-line/40 px-3 py-2">
        <div>
          <h3 className="text-lg font-semibold">Active Loan Installments</h3>
          <p className="text-xs text-muted">Use Edit to update schedule and track active liabilities or view closed history.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none"
            onChange={(event) => setStatusDraftFilter(event.target.value as StatusFilter)}
            value={statusDraftFilter}
          >
            <option value="active">Active Only</option>
            <option value="all">All Statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            className="h-9 w-[190px] rounded-lg border border-line bg-surface px-3 text-sm outline-none"
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search loans..."
            value={search}
          />
          <button
            className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-muted"
            onClick={() => {
              setStatusFilter(statusDraftFilter);
              setCurrentPage(1);
            }}
            type="button"
          >
            Filter
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line bg-soft-line/60 text-left text-[11px] uppercase tracking-[0.1em] text-muted">
              <th className="px-3 py-3">Loan Details</th>
              <th className="px-3 py-3 text-right">Outstanding Debt</th>
              <th className="px-3 py-3 text-right">Monthly</th>
              <th className="px-3 py-3">Timeline / Progress</th>
              <th className="px-3 py-3 text-right">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedLoans.map((loan) => {
              const timeline = getTimeline(loan);
              const canEdit = Boolean(loan.id);
              const isClosed = loan.status.toLowerCase() === "closed" || loan.isActive === false;

              return (
                <tr
                  key={loan.id || loan.name}
                  className={`border-b border-line/70 transition hover:bg-soft-line/30 ${canEdit ? "cursor-pointer" : ""}`}
                  onDoubleClick={() => {
                    if (canEdit) {
                      openEdit(loan);
                    }
                  }}
                >
                  <td className="px-3 py-3">
                    <p className="font-semibold">{loan.name}</p>
                    <p className="text-xs text-muted">Started {timeline.startedLabel}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{formatPHP(loan.outstandingDebt ?? loan.totalDebt ?? 0)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-danger">{formatPHP(loan.monthly)}</td>
                  <td className="px-3 py-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>{`${Math.min(timeline.paidMonths, timeline.totalMonths)} of ${timeline.totalMonths} months`}</span>
                      <span>{loan.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-soft-line">
                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${loan.progress}%` }} />
                    </div>
                    {typeof loan.overdueInstallments === "number" && loan.overdueInstallments > 0 ? (
                      <p className="mt-1 text-[11px] text-danger">{loan.overdueInstallments} overdue</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusBadgeClass(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canEdit}
                        onClick={() => openEdit(loan)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-accent/40 bg-accent-soft px-2 py-1 text-xs font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canEdit || updatingPaymentId === loan.id}
                        onClick={() => toggleCurrentMonthPaid(loan, isClosed ? false : !loan.paidThisMonth)}
                        type="button"
                      >
                        {updatingPaymentId === loan.id
                          ? "Updating..."
                          : isClosed
                          ? "Reopen"
                          : loan.paidThisMonth
                          ? "Mark Unpaid"
                          : "Mark Paid (Due)"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagedLoans.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-muted" colSpan={6}>
                  {hasAnyLoans
                    ? "No liabilities match your current search or filter."
                    : "No liabilities yet. Use + New Liability in the page header to add your first record."}
                  {!hasAnyLoans && showControls ? (
                    <div className="mt-3">
                      <button className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white" onClick={openCreate} type="button">
                        Add First Liability
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-soft-line/30 px-3 py-2 text-xs text-muted">
        <p>
          {filteredLoans.length === 0
            ? "Showing 0 liabilities"
            : `Showing ${pageStart + 1} to ${Math.min(pageEnd, filteredLoans.length)} of ${filteredLoans.length} liabilities`}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-line bg-surface px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={activePage === 1}
            onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-line bg-surface px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={activePage >= totalPages}
            onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-3">
          <form className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5" onSubmit={handleSubmit}>
            <h3 className="text-lg font-semibold">{editingId ? "Edit Liability" : "Create Liability"}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">Name</span>
                <input
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  value={form.name}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">Date Incurred</span>
                <input
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  onChange={(event) => setForm((prev) => ({ ...prev, dateIncurred: event.target.value }))}
                  required
                  type="date"
                  value={form.dateIncurred}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">Monthly Amortization</span>
                <input
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  min={0.01}
                  onChange={(event) => setForm((prev) => ({ ...prev, monthlyAmortization: event.target.value }))}
                  required
                  step="0.01"
                  type="number"
                  value={form.monthlyAmortization}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">Total Monthly Period</span>
                <input
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  min={1}
                  onChange={(event) => setForm((prev) => ({ ...prev, termMonths: event.target.value }))}
                  required
                  step="1"
                  type="number"
                  value={form.termMonths}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-muted">Status</span>
                <select
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2"
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as LiabilityStatus }))}
                  value={form.status}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2 rounded-xl border border-line bg-soft-line/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Computed Preview</p>
                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-3">
                  <p>Total Debt: <span className="font-semibold">{formatPHP(formPreview.totalDebt)}</span></p>
                  <p>Due Months: <span className="font-semibold">{formPreview.dueInstallments}</span></p>
                  <p>Outstanding: <span className="font-semibold">{formatPHP(formPreview.outstanding)}</span></p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {editingId ? (
                <button
                  className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger"
                  onClick={() => handleDelete(editingId)}
                  type="button"
                >
                  Delete
                </button>
              ) : null}
              <button
                className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold"
                onClick={closeModal}
                type="button"
              >
                Cancel
              </button>
              <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white" disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Liability"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
