"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TransactionKind = "income" | "expense";

const EXPENSE_CATEGORIES = [
  "debt",
  "personal",
  "savings",
  "medical",
  "utilities",
  "subscriptions",
  "rent",
  "insurance",
  "transport",
  "other",
];

const INCOME_CATEGORIES = [
  "salary",
  "business",
  "freelance",
  "dividends",
  "interest",
  "rent",
  "passive",
  "other",
];

type TransactionFormPayload = {
  title: string;
  kind: TransactionKind;
  category: string;
  amount: number;
  transactionDate: string;
  notes: string;
};

type TransactionFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type FormState = {
  title: string;
  kind: TransactionKind;
  category: string;
  amount: string;
  transactionDate: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  kind: "expense",
  category: "personal",
  amount: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function TransactionForm({ open, onClose, onSuccess }: TransactionFormProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setError(null);
    }
  }, [open]);

  const categories = form.kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/35">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="panel mx-auto w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add Transaction</h3>
            <button className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={onClose} type="button">
              Close
            </button>
          </div>

          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);

              if (!form.title.trim()) {
                setError("Transaction title is required.");
                return;
              }

              const amount = Number(form.amount);
              if (Number.isNaN(amount) || amount <= 0) {
                setError("Please enter a valid amount.");
                return;
              }

              setSubmitting(true);
              try {
                const response = await fetch("/api/transactions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: form.title.trim(),
                    kind: form.kind,
                    category: form.category,
                    amount,
                    transactionDate: new Date(form.transactionDate).toISOString(),
                    notes: form.notes.trim(),
                  }),
                });

                const result = await response.json();

                if (!result.success) {
                  throw new Error(result.error?.message || "Failed to create transaction");
                }

                onSuccess();
                onClose();
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "Unable to save transaction.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="kind"
                  checked={form.kind === "expense"}
                  onChange={() => setForm((current) => ({ ...current, kind: "expense", category: "personal" }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Expense</span>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="kind"
                  checked={form.kind === "income"}
                  onChange={() => setForm((current) => ({ ...current, kind: "income", category: "salary" }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Income</span>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Title</span>
              <input
                className="rounded-lg border border-line bg-surface px-3 py-2"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder={form.kind === "expense" ? "Groceries, Gas, etc." : "Salary, Freelance, etc."}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Category</span>
              <select
                className="rounded-lg border border-line bg-surface px-3 py-2"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Amount</span>
              <input
                className="rounded-lg border border-line bg-surface px-3 py-2"
                value={form.amount}
                type="number"
                min="0"
                step="0.01"
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0.00"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Date</span>
              <input
                className="rounded-lg border border-line bg-surface px-3 py-2"
                value={form.transactionDate}
                type="date"
                onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Notes (optional)</span>
              <textarea
                className="min-h-20 rounded-lg border border-line bg-surface px-3 py-2"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Add any notes..."
              />
            </label>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button className="rounded-lg border border-line px-4 py-2 text-sm" onClick={onClose} type="button">
                Cancel
              </button>
              <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" disabled={submitting} type="submit">
                {submitting ? "Saving..." : "Add Transaction"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
