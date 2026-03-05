import { toMonthKey } from "@/lib/month";
import { investmentsMock } from "@/lib/mocks/investments";
import { netWorthTrendMock } from "@/lib/mocks/net-worth";

import type { FinanceDataProvider } from "@/lib/data/types";
import type {
  AssetsData,
  ApiResponse,
  DashboardData,
  DebtsData,
  NetWorthTrendData,
} from "@/types/finance";

type ApiTransactionItem = {
  title: string;
  category: string;
  amount: number;
  kind: "income" | "expense";
  transactionDate: string;
};

type TransactionsPayload = {
  items: ApiTransactionItem[];
  total: number;
};

type BudgetInsightsPayload = {
  month: string;
  insights: {
    overspentCategories: Array<{ category: string; variance: number }>;
  };
};

type DashboardOverviewPayload = {
  month: string;
  kpis: {
    monthIncome: number;
    monthExpenses: number;
    monthCashFlow: number;
    netCashPosition: number;
    budgetUtilizationPercent: number;
    allocationBalance: number;
  };
  topExpenseCategories: Array<{ category: string; total: number }>;
  statement?: {
    asOf: string;
    incomeStatement: DashboardData["incomeStatement"];
    balanceSheet: DashboardData["balanceSheet"];
  };
};

function emptyDashboardData(month = toMonthKey(new Date())): DashboardData {
  return {
    title: "Personal Finance Overview",
    subtitle: `As of ${month}`,
    financialSummary: {
      totalIncome: 0,
      totalExpenses: 0,
      activeIncome: 0,
      passiveIncome: 0,
    },
    incomeStatement: {
      activeIncome: [],
      passiveIncome: [],
      expenses: [],
      totals: {
        activeIncome: 0,
        passiveIncome: 0,
        income: 0,
        expenses: 0,
      },
    },
    balanceSheet: {
      assets: [],
      liabilities: [],
      totals: {
        assets: 0,
        assetsIncome: 0,
        liabilities: 0,
        liabilitiesPayment: 0,
        netWorth: 0,
      },
    },
    metrics: [
      { label: "Net Worth", value: 0, note: "Assets - Liabilities", tone: "default" },
      { label: "Liquid Funds", value: 0, note: "Liquid assets available", tone: "default" },
      { label: "Monthly Cash Flow", value: 0, note: "Income - Expenses", tone: "default" },
      { label: "Cash on Hand", value: 0, note: "Available physical cash", tone: "default" },
    ],
    transactions: [],
    liabilities: [],
    spendingMix: [],
  };
}

function emptyDebtsData(): DebtsData {
  return {
    title: "Liability & Debt Repayment",
    subtitle: `As of ${toMonthKey(new Date())}`,
    stats: [
      { label: "Total Debt", value: "PHP 0.00", note: "Estimated from active debt obligations", tone: "danger" },
      { label: "Monthly Payment", value: "PHP 0.00", note: "Derived from this month debt transactions", tone: "default" },
      { label: "Debt to Passive Income", value: "0%", note: "Watchlist", tone: "warning" },
      { label: "Debt to Income Ratio", value: "0%", note: "Stable", tone: "default" },
    ],
    loans: [],
    recurringBills: [],
    projection: {
      debtFreeBy: "Debt-free now",
      progress: 0,
      remainingMonths: 0,
    },
  };
}

async function fetchJson<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as ApiResponse<T>;
}

async function tryFetchJson<T>(url: string): Promise<ApiResponse<T> | null> {
  try {
    return await fetchJson<T>(url);
  } catch {
    return null;
  }
}

function mapDashboardFromTransactions(items: ApiTransactionItem[]): DashboardData {
  const currentMonth = toMonthKey(new Date());
  const monthKeys = Array.from(new Set(items.map((item) => item.transactionDate.slice(0, 7)).filter(Boolean))).sort();
  const fallbackMonth = monthKeys[monthKeys.length - 1] || currentMonth;
  const selectedMonth = items.some((item) => item.transactionDate.slice(0, 7) === currentMonth)
    ? currentMonth
    : fallbackMonth;
  const monthItems = items.filter((item) => item.transactionDate.slice(0, 7) === selectedMonth);

  const income = monthItems.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthItems.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const passiveCategories = new Set(["savings", "investment", "dividends", "passive", "other"]);
  const groupByLabel = (rows: ApiTransactionItem[]) => {
    const map = new Map<string, number>();

    for (const row of rows) {
      const label = (row.title || row.category || "Other").trim();
      map.set(label, (map.get(label) || 0) + row.amount);
    }

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };
  const passiveIncome = monthItems
    .filter((item) => item.kind === "income" && passiveCategories.has(item.category.toLowerCase()))
    .reduce((sum, item) => sum + item.amount, 0);
  const activeIncome = Math.max(income - passiveIncome, 0);

  const activeIncomeRows = groupByLabel(
    monthItems.filter((item) => item.kind === "income" && !passiveCategories.has(item.category.toLowerCase())),
  );
  const passiveIncomeRows = groupByLabel(
    monthItems.filter((item) => item.kind === "income" && passiveCategories.has(item.category.toLowerCase())),
  );
  const expenseRowsBase = groupByLabel(monthItems.filter((item) => item.kind === "expense"));
  const expenseRows = expenseRowsBase.map((item) => ({
    ...item,
    percentage: expenses > 0 ? Math.round((item.value / expenses) * 100) : 0,
  }));

  const transactions = monthItems
    .filter((item) => item.kind === "expense")
    .slice(0, 5)
    .map((item) => ({
      name: item.title,
      category: item.category,
      date: new Date(item.transactionDate).toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      amount: item.amount,
    }));

  const base = emptyDashboardData(selectedMonth);

  return {
    ...base,
    subtitle: `As of ${selectedMonth}`,
    financialSummary: {
      totalIncome: income,
      totalExpenses: expenses,
      activeIncome,
      passiveIncome,
    },
    incomeStatement: {
      activeIncome: activeIncomeRows,
      passiveIncome: passiveIncomeRows,
      expenses: expenseRows,
      totals: {
        activeIncome,
        passiveIncome,
        income,
        expenses,
      },
    },
    balanceSheet: {
      assets: [],
      liabilities: [],
      totals: {
        assets: Math.max(income - expenses, 0),
        assetsIncome: passiveIncome,
        liabilities: 0,
        liabilitiesPayment: 0,
        netWorth: Math.max(income - expenses, 0),
      },
    },
    metrics: [
      {
        label: "Net Worth",
        value: Math.max(income - expenses, 0),
        note: "Income - Expenses (current month)",
        tone: "default",
      },
      {
        label: "Liquid Funds",
        value: Math.max(income - expenses, 0),
        note: "Derived from current month transactions",
        tone: "default",
      },
      {
        label: "Monthly Cash Flow",
        value: income - expenses,
        note: "Income - Expenses",
        tone: income >= expenses ? "success" : "danger",
      },
      {
        label: "Cash on Hand",
        value: Math.max(income - expenses, 0),
        note: "Calculated from current month transactions",
        tone: "default",
      },
    ],
    transactions,
  };
}

function mapDashboardFromOverview(overview: DashboardOverviewPayload, items: ApiTransactionItem[]): DashboardData {
  const transactions = items
    .filter((item) => item.kind === "expense")
    .slice(0, 5)
    .map((item) => ({
      name: item.title,
      category: item.category,
      date: new Date(item.transactionDate).toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
      amount: item.amount,
    }));

  const totalExpenses = Math.max(overview.kpis.monthExpenses, 1);
  const spendingMix =
    overview.topExpenseCategories.length > 0
      ? overview.topExpenseCategories.map((item) => ({
          label: item.category,
          percentage: Math.round((item.total / totalExpenses) * 100),
        }))
      : [];

  const liabilities = overview.statement?.balanceSheet?.liabilities?.map((item) => ({
    item: item.label,
    principal: item.debt,
    payment: item.payment,
    status: "on track",
  })) || [];

  const activeIncome = overview.statement?.incomeStatement?.totals.activeIncome || 0;
  const passiveIncome = overview.statement?.incomeStatement?.totals.passiveIncome || 0;

  const base = emptyDashboardData(overview.month);

  return {
    ...base,
    subtitle: `As of ${overview.month}`,
    financialSummary: {
      totalIncome: overview.kpis.monthIncome,
      totalExpenses: overview.kpis.monthExpenses,
      activeIncome,
      passiveIncome,
    },
    incomeStatement: overview.statement?.incomeStatement || base.incomeStatement,
    balanceSheet: overview.statement?.balanceSheet || base.balanceSheet,
    metrics: [
      {
        label: "Net Worth",
        value: overview.statement?.balanceSheet?.totals.netWorth || overview.kpis.netCashPosition,
        note: "Assets - Liabilities",
        tone: "success",
      },
      {
        label: "Liquid Funds",
        value:
          overview.statement?.balanceSheet?.assets
            ?.filter((item) => ["Cash in hand", "Banks Accounts"].includes(item.label))
            .reduce((sum, item) => sum + item.value, 0) || 0,
        note: "Liquid assets available",
        tone: "default",
      },
      {
        label: "Monthly Cash Flow",
        value: overview.kpis.monthCashFlow,
        note: "Income - Expenses",
        tone: overview.kpis.monthCashFlow >= 0 ? "success" : "danger",
      },
      {
        label: "Cash on Hand",
        value:
          overview.statement?.balanceSheet?.assets?.find((item) => item.label === "Cash in hand")?.value || 0,
        note: "Available physical cash",
        tone: "default",
      },
    ],
    transactions,
    liabilities,
    spendingMix,
  };
}

export function createApiDataProvider(baseUrl: string): FinanceDataProvider {
  return {
    async getDashboardData() {
      try {
        const [
          { connectToDatabase },
          { Transaction },
          { Asset },
          { Liability },
          { buildNetWorthBreakdown },
        ] = await Promise.all([
          import("@/lib/mongodb"),
          import("@/models/Transaction"),
          import("@/models/Investment"),
          import("@/models/Liability"),
          import("@/lib/services/net-worth"),
        ]);

        await connectToDatabase();

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [transactions, assets, liabilities] = await Promise.all([
          Transaction.find({ transactionDate: { $gte: monthStart, $lte: monthEnd } }).sort({ transactionDate: -1 }).lean(),
          Asset.find({ isActive: true }).lean(),
          Liability.find({ isActive: true }).lean(),
        ]);

        const payloadItems: ApiTransactionItem[] = transactions.map((item) => ({
          title: item.title,
          category: item.category,
          amount: item.amount,
          kind: item.kind,
          transactionDate: new Date(item.transactionDate).toISOString(),
        }));

        const breakdown = buildNetWorthBreakdown(assets, liabilities);

        const monthIncome = transactions
          .filter((t) => t.kind === "income")
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const monthExpenses = transactions
          .filter((t) => t.kind === "expense")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
          title: "Personal Finance Overview",
          subtitle: `As of ${monthKey}`,
          financialSummary: {
            totalIncome: monthIncome,
            totalExpenses: monthExpenses,
            activeIncome: monthIncome * 0.8,
            passiveIncome: monthIncome * 0.2,
          },
          incomeStatement: {
            activeIncome: [{ label: "Salary", value: monthIncome * 0.8 }],
            passiveIncome: [{ label: "Investments", value: monthIncome * 0.2 }],
            expenses: [],
            totals: {
              activeIncome: monthIncome * 0.8,
              passiveIncome: monthIncome * 0.2,
              income: monthIncome,
              expenses: monthExpenses,
            },
          },
          balanceSheet: {
            assets: breakdown.assets,
            liabilities: breakdown.liabilities,
            totals: breakdown.totals,
          },
          metrics: [
            {
              label: "Net Worth",
              value: breakdown.totals.netWorth,
              note: "Assets - Liabilities",
              tone: "success",
            },
            {
              label: "Liquid Funds",
              value: breakdown.assets.find((a) => a.label === "Banks Accounts")?.value || 0,
              note: "Liquid assets available",
              tone: "default",
            },
            {
              label: "Monthly Cash Flow",
              value: monthIncome - monthExpenses,
              note: "Income - Expenses",
              tone: monthIncome - monthExpenses >= 0 ? "success" : "danger",
            },
            {
              label: "Cash on Hand",
              value: breakdown.assets.find((a) => a.label === "Cash in hand")?.value || 0,
              note: "Available physical cash",
              tone: "default",
            },
          ],
          transactions: [],
          liabilities: [],
          spendingMix: [],
        };
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
        return emptyDashboardData();
      }
    },

    async getAssetsData() {
      if (!baseUrl) {
        try {
          const { GET } = await import("@/app/api/assets/overview/route");
          const response = await GET();
          const payload = (await response.json()) as ApiResponse<AssetsData>;
          if (payload.success && payload.data) {
            return payload.data;
          }
          return investmentsMock;
        } catch {
          return investmentsMock;
        }
      }

      try {
        const response = await fetchJson<AssetsData>(`${baseUrl}/api/assets/overview`);
        if (!response.success || !response.data) {
          return investmentsMock;
        }

        return response.data;
      } catch {
        return investmentsMock;
      }
    },

    async getDebtsData() {
      if (!baseUrl) {
        try {
          const { GET } = await import("@/app/api/debts/overview/route");
          const response = await GET();
          const payload = (await response.json()) as ApiResponse<DebtsData>;
          if (payload.success && payload.data) {
            return payload.data;
          }
          return emptyDebtsData();
        } catch {
          return emptyDebtsData();
        }
      }

      try {
        const response = await fetchJson<DebtsData>(`${baseUrl}/api/debts/overview`);
        if (!response.success || !response.data) {
          return emptyDebtsData();
        }

        return response.data;
      } catch {
        return emptyDebtsData();
      }
    },

    async getNetWorthTrendData() {
      try {
        const [{ connectToDatabase }, { NetWorthSnapshot }] = await Promise.all([
          import("@/lib/mongodb"),
          import("@/models/NetWorthSnapshot"),
        ]);

        await connectToDatabase();

        const snapshots = await NetWorthSnapshot.find().sort({ month: 1 }).limit(12).lean();

        if (snapshots.length === 0) {
          return netWorthTrendMock;
        }

        const points = snapshots.map((snap) => ({
          month: snap.month,
          label: snap.month.split("-")[1] + "/" + snap.month.split("-")[0].slice(2),
          value: snap.netWorth || 0,
        }));

        const latest = snapshots[snapshots.length - 1];
        const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const isCurrentMonthCaptured = latest.month === currentMonth;

        const delta = previous ? (latest.netWorth || 0) - (previous.netWorth || 0) : 0;
        const deltaPercent = previous && previous.netWorth ? (delta / previous.netWorth) * 100 : 0;

        return {
          points,
          latest: {
            month: latest.month,
            value: latest.netWorth || 0,
            assetsTotal: latest.assetsTotal || 0,
            liabilitiesTotal: latest.liabilitiesTotal || 0,
            capturedAt: latest.capturedAt ? new Date(latest.capturedAt).toISOString() : new Date().toISOString(),
          },
          previous: previous
            ? {
                month: previous.month,
                value: previous.netWorth || 0,
                capturedAt: previous.capturedAt ? new Date(previous.capturedAt).toISOString() : new Date().toISOString(),
              }
            : null,
          delta,
          deltaPercent,
          isCurrentMonthCaptured,
        };
      } catch {
        return netWorthTrendMock;
      }
    },
  };
}
