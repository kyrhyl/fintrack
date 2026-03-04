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
  const monthItems = items.filter((item) => item.transactionDate.slice(0, 7) === currentMonth);

  const income = monthItems.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthItems.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const passiveCategories = new Set(["savings", "investment", "dividends", "passive", "other"]);
  const passiveIncome = monthItems
    .filter((item) => item.kind === "income" && passiveCategories.has(item.category.toLowerCase()))
    .reduce((sum, item) => sum + item.amount, 0);
  const activeIncome = Math.max(income - passiveIncome, 0);

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

  const base = emptyDashboardData(currentMonth);

  return {
    ...base,
    financialSummary: {
      totalIncome: income,
      totalExpenses: expenses,
      activeIncome,
      passiveIncome,
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
      if (!baseUrl) {
        try {
          const [{ GET: getDashboardOverview }, { GET: getTransactions }] = await Promise.all([
            import("@/app/api/dashboard/overview/route"),
            import("@/app/api/transactions/route"),
          ]);

          const [overviewResponseRaw, transactionsResponseRaw] = await Promise.all([
            getDashboardOverview(new Request("http://localhost/api/dashboard/overview")),
            getTransactions(),
          ]);

          const [overviewResponse, txResponse] = await Promise.all([
            overviewResponseRaw.json() as Promise<ApiResponse<DashboardOverviewPayload>>,
            transactionsResponseRaw.json() as Promise<ApiResponse<TransactionsPayload>>,
          ]);

          if (overviewResponse.success && overviewResponse.data && txResponse.success && txResponse.data) {
            return mapDashboardFromOverview(overviewResponse.data, txResponse.data.items);
          }

          if (txResponse.success && txResponse.data) {
            return mapDashboardFromTransactions(txResponse.data.items);
          }

          return emptyDashboardData();
        } catch {
          return emptyDashboardData();
        }
      }

      try {
        const [overviewResponse, txResponse] = await Promise.all([
          fetchJson<DashboardOverviewPayload>(`${baseUrl}/api/dashboard/overview`),
          fetchJson<TransactionsPayload>(`${baseUrl}/api/transactions`),
        ]);

        if (overviewResponse.success && overviewResponse.data && txResponse.success && txResponse.data) {
          return mapDashboardFromOverview(overviewResponse.data, txResponse.data.items);
        }

        if (!txResponse.success || !txResponse.data) {
          return emptyDashboardData();
        }

        const mapped = mapDashboardFromTransactions(txResponse.data.items);
        const month = toMonthKey(new Date());

        const insightsResponse = await tryFetchJson<BudgetInsightsPayload>(`${baseUrl}/api/budget/${month}/insights`);
        const overspent = insightsResponse?.success
          ? insightsResponse.data?.insights.overspentCategories?.reduce((sum, item) => sum + item.variance, 0) || 0
          : 0;

        return {
          ...mapped,
          metrics: mapped.metrics.map((metric, index) =>
            index === 0
              ? {
                  ...metric,
                  note: overspent > 0 ? `Overspending detected: PHP ${overspent.toFixed(2)}` : metric.note,
                  tone: overspent > 0 ? "danger" : metric.tone,
                }
              : metric,
          ),
        };
      } catch {
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
      if (!baseUrl) {
        return netWorthTrendMock;
      }

      try {
        const response = await fetchJson<NetWorthTrendData>(`${baseUrl}/api/net-worth?limit=12`);
        if (!response.success || !response.data) {
          return netWorthTrendMock;
        }

        return response.data;
      } catch {
        return netWorthTrendMock;
      }
    },
  };
}
