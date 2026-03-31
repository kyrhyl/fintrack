import { applyAllocationStrategy, computeBudgetActuals, roundMoney } from "@/lib/services/budget";
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
      deductions: {
        items: [],
        total: 0,
      },
      recurringDebt: {
        items: [],
        total: 0,
      },
      budgetActuals: {
        plannedTotal: 0,
        actualTotal: 0,
        utilizationPercent: 0,
        categories: [],
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
      deductions: base.incomeStatement?.deductions,
      recurringDebt: base.incomeStatement?.recurringDebt,
      budgetActuals: base.incomeStatement?.budgetActuals,
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
          { BudgetPlan },
          { buildIncomeSummary },
        ] = await Promise.all([
          import("@/lib/mongodb"),
          import("@/models/Transaction"),
          import("@/models/Investment"),
          import("@/models/Liability"),
          import("@/lib/services/net-worth"),
          import("@/models/BudgetPlan"),
          import("@/lib/services/income-summary"),
        ]);

        await connectToDatabase();

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [transactions, assets, liabilities, budgetPlan, incomeSummary] = await Promise.all([
          Transaction.find({ transactionDate: { $gte: monthStart, $lte: monthEnd } }).sort({ transactionDate: -1 }).lean(),
          Asset.find({ isActive: true }).lean(),
          Liability.find({ isActive: true }).lean(),
          BudgetPlan.findOne({ month: monthKey }).lean(),
          buildIncomeSummary(monthKey, { connect: false }),
        ]);

        const payloadItems: ApiTransactionItem[] = transactions.map((item) => ({
          title: item.title,
          category: item.category,
          amount: item.amount,
          kind: item.kind,
          transactionDate: new Date(item.transactionDate).toISOString(),
        }));

        const breakdown = buildNetWorthBreakdown(assets, liabilities);

        const activeIncomeTotal = roundMoney(
          incomeSummary.totals.salaryGross + incomeSummary.totals.otherActive,
        );
        const passiveIncomeTotal = roundMoney(
          incomeSummary.totals.investmentInterest + incomeSummary.totals.otherPassive,
        );
        const monthIncome = roundMoney(activeIncomeTotal + passiveIncomeTotal);
        const monthExpenses = transactions
          .filter((t) => t.kind === "expense")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const deductionItems = [
          ...(incomeSummary.salary?.deductions || []),
          ...(incomeSummary.salary?.loanDeductions || []),
        ]
          .map((item) => ({ label: item.name || "Deduction", value: item.amount || 0 }))
          .filter((item) => item.value > 0);
        const deductionsTotal = roundMoney(deductionItems.reduce((sum, item) => sum + item.value, 0));

        const salaryDeductionNames = new Set(
          [...(incomeSummary.salary?.deductions || []), ...(incomeSummary.salary?.loanDeductions || [])]
            .map((item) => (item.name || "").trim().toLowerCase())
            .filter(Boolean),
        );

        const recurringDebtItems = (liabilities || [])
          .filter((item) => !salaryDeductionNames.has((item.name || "").trim().toLowerCase()))
          .map((item) => {
            const payment = item.monthlyPayment && item.monthlyPayment > 0 ? item.monthlyPayment : item.monthlyAmortization || 0;
            return { label: item.name || "Recurring Debt", value: payment };
          })
          .filter((item) => item.value > 0);
        const recurringDebtTotal = roundMoney(recurringDebtItems.reduce((sum, item) => sum + item.value, 0));

        const actualByCategory = transactions
          .filter((t) => t.kind === "expense")
          .reduce<Record<string, number>>((acc, item) => {
            const key = item.category || "Other";
            acc[key] = roundMoney((acc[key] || 0) + (item.amount || 0));
            return acc;
          }, {});

        const budgetCategories = budgetPlan?.categories || [];
        const allocationResult = budgetPlan
          ? applyAllocationStrategy(budgetCategories, budgetPlan.allocationStrategy, budgetPlan.plannedIncome || 0)
          : { success: true as const, categories: [] as typeof budgetCategories };
        const plannedCategories = allocationResult.success ? allocationResult.categories : budgetCategories;

        const budgetActuals = budgetPlan
          ? computeBudgetActuals(
              plannedCategories.map((item: { name: string; plannedAmount?: number }) => ({
                name: item.name,
                plannedAmount: item.plannedAmount || 0,
              })),
              actualByCategory,
            )
          : [];
        const budgetPlannedTotal = roundMoney(budgetActuals.reduce((sum, item) => sum + item.plannedAmount, 0));
        const budgetActualTotal = roundMoney(budgetActuals.reduce((sum, item) => sum + item.actualAmount, 0));
        const budgetUtilization = budgetPlannedTotal > 0 ? roundMoney((budgetActualTotal / budgetPlannedTotal) * 100) : 0;
        const expenseBaseTotal = budgetActuals.length > 0 ? budgetActualTotal : monthExpenses;
        const statementExpensesTotal = roundMoney(expenseBaseTotal + deductionsTotal + recurringDebtTotal);

        return {
          title: "Personal Finance Overview",
          subtitle: `As of ${monthKey}`,
          financialSummary: {
            totalIncome: monthIncome,
            totalExpenses: statementExpensesTotal,
            activeIncome: activeIncomeTotal,
            passiveIncome: passiveIncomeTotal,
          },
          incomeStatement: {
            activeIncome: [
              { label: "Salary", value: incomeSummary.totals.salaryGross },
              { label: "Other Active", value: incomeSummary.totals.otherActive },
            ].filter((item) => item.value > 0),
            passiveIncome: [
              { label: "Investments", value: incomeSummary.totals.investmentInterest },
              { label: "Other Passive", value: incomeSummary.totals.otherPassive },
            ].filter((item) => item.value > 0),
            expenses: [],
            totals: {
              activeIncome: activeIncomeTotal,
              passiveIncome: passiveIncomeTotal,
              income: monthIncome,
              expenses: statementExpensesTotal,
            },
            deductions: {
              items: deductionItems,
              total: deductionsTotal,
            },
            recurringDebt: {
              items: recurringDebtItems,
              total: recurringDebtTotal,
            },
            budgetActuals: {
              plannedTotal: budgetPlannedTotal,
              actualTotal: budgetActualTotal,
              utilizationPercent: budgetUtilization,
              categories: budgetActuals.map((item) => ({
                label: item.category,
                planned: item.plannedAmount,
                actual: item.actualAmount,
                variance: item.variance,
                percentUsed: item.utilizationPercent,
                overBudget: item.overBudget,
              })),
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
              value: monthIncome - statementExpensesTotal,
              note: "Income - Expenses",
              tone: monthIncome - statementExpensesTotal >= 0 ? "success" : "danger",
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

        const snapshots = await NetWorthSnapshot.find().sort({ capturedAt: -1 }).limit(12).lean();

        if (snapshots.length === 0) {
          return netWorthTrendMock;
        }

        const ordered = [...snapshots].sort((a, b) => {
          const aTime = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
          const bTime = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
          return aTime - bTime;
        });

        const points = ordered.map((snap) => {
          const capturedAt = snap.capturedAt ? new Date(snap.capturedAt) : null;
          const source = capturedAt || new Date(`${snap.month}-01T00:00:00`);
          const labelMonth = source.toLocaleDateString("en-US", { month: "short" });
          const labelYear = source.toLocaleDateString("en-US", { year: "2-digit" });

          return {
            month: snap.month,
            label: `${labelMonth} '${labelYear}`,
            value: snap.netWorth || 0,
            assetsTotal: snap.assetsTotal || 0,
            liabilitiesTotal: snap.liabilitiesTotal || 0,
          };
        });

        const latest = ordered[ordered.length - 1];
        const previous = ordered.length > 1 ? ordered[ordered.length - 2] : null;
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const isCurrentMonthCaptured = ordered.some((snap) => snap.captureDate?.startsWith(currentMonth));

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
                assetsTotal: previous.assetsTotal || 0,
                liabilitiesTotal: previous.liabilitiesTotal || 0,
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

    async getDailyTrackingData(date?: string) {
      try {
        const [
          { connectToDatabase },
          { Transaction },
          { BudgetPlan },
        ] = await Promise.all([
          import("@/lib/mongodb"),
          import("@/models/Transaction"),
          import("@/models/BudgetPlan"),
        ]);

        await connectToDatabase();

        const targetDate = date ? new Date(date) : new Date();
        const dateStr = targetDate.toISOString().split("T")[0];
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
        const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(targetDate);
        weekEnd.setHours(23, 59, 59, 999);

        const [dayTransactions, monthTransactions, budgetPlan, upcomingRecurring, salaryRecord, liabilities, weeklyTransactions] = await Promise.all([
          Transaction.find({
            transactionDate: {
              $gte: new Date(dateStr),
              $lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
            },
          })
            .sort({ transactionDate: -1 })
            .lean(),
          Transaction.find({
            transactionDate: { $gte: monthStart, $lte: monthEnd },
            kind: "expense",
          }).lean(),
          BudgetPlan.findOne({ month: monthKey }).lean(),
          import("@/models/RecurringExpense").then(({ RecurringExpense }) =>
            RecurringExpense.find({ isActive: true })
              .sort({ nextDueDate: 1 })
              .limit(5)
              .lean(),
          ),
          import("@/models/SalaryRecord").then(({ SalaryRecord }) =>
            SalaryRecord.findOne().sort({ createdAt: -1 }).lean(),
          ),
          import("@/models/Liability").then(({ Liability }) =>
            Liability.find({ isActive: true, status: { $ne: "closed" } })
              .sort({ monthlyPayment: -1 })
              .lean(),
          ),
          Transaction.find({
            transactionDate: { $gte: weekStart, $lte: weekEnd },
            kind: "expense",
          }).lean(),
        ]);

        const todaySpending = dayTransactions
          .filter((t) => t.kind === "expense")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const monthSpending = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        const categories = budgetPlan?.categories || [];
        const categoryNames = categories.length > 0
          ? categories.map((c: { name: string }) => c.name)
          : ["Housing", "Food", "Transportation", "Utilities", "Entertainment", "Savings", "Other"];

        const actualByCategory: Record<string, number> = {};
        monthTransactions.forEach((t) => {
          const cat = t.category || "Other";
          actualByCategory[cat] = (actualByCategory[cat] || 0) + (t.amount || 0);
        });

        const salaryDeductionNames = new Set(
          [
            ...(salaryRecord?.deductions || []),
            ...(salaryRecord?.loanDeductions || []),
          ]
            .map((item: { name?: string }) => (item.name || "").trim().toLowerCase())
            .filter(Boolean),
        );

        const filteredCategories = categories.filter((category: { name: string }) =>
          !salaryDeductionNames.has(category.name.trim().toLowerCase()),
        );

        const filteredCategoryNames = filteredCategories.length > 0
          ? filteredCategories.map((c: { name: string }) => c.name)
          : categoryNames;

        const budgetProgress = filteredCategoryNames.map((category: string) => {
          const planned = categories.find((c: { name: string }) => c.name === category)?.plannedAmount || 0;
          const actual = actualByCategory[category] || 0;
          const remaining = Math.max(0, planned - actual);
          const percentUsed = planned > 0 ? Math.round((actual / planned) * 100) : 0;

          return { category, planned, actual, remaining, percentUsed };
        });

        const budgetedTotal = filteredCategories.reduce(
          (sum: number, item: { plannedAmount?: number }) => sum + (item.plannedAmount || 0),
          0,
        );

        const netSalary = salaryRecord?.netPay || 0;
        const salaryMonth = salaryRecord?.month || null;

        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(1, daysInMonth - targetDate.getDate() + 1);
        
        const recurringDebts = (liabilities || [])
          .filter((item: { name?: string }) => !salaryDeductionNames.has((item.name || "").trim().toLowerCase()))
          .map((item: { _id: unknown; name?: string; category?: string; monthlyPayment?: number; monthlyAmortization?: number; outstandingBalance?: number; status?: string; }) => {
          const monthlyPayment = item.monthlyPayment && item.monthlyPayment > 0
            ? item.monthlyPayment
            : item.monthlyAmortization || 0;
          return {
            id: String(item._id),
            name: item.name || "Untitled debt",
            category: item.category || "other",
            monthlyPayment,
            outstandingBalance: item.outstandingBalance || 0,
            status: item.status || "on track",
          };
        });

        const recurringDebtsTotal = recurringDebts.reduce((sum, item) => sum + item.monthlyPayment, 0);
        
        const disposableMonthly = netSalary - recurringDebtsTotal - budgetedTotal;
        const dailyAllowance = disposableMonthly > 0 ? disposableMonthly / daysRemaining : 0;

        const weeklyTotalsByDate = new Map<string, number>();
        weeklyTransactions.forEach((item) => {
          const key = new Date(item.transactionDate).toISOString().split("T")[0];
          weeklyTotalsByDate.set(key, (weeklyTotalsByDate.get(key) || 0) + (item.amount || 0));
        });

        const weeklySpending = Array.from({ length: 7 }).map((_, index) => {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + index);
          const key = date.toISOString().split("T")[0];
          return {
            date: key,
            label: date.toLocaleDateString("en-PH", { weekday: "short" }),
            amount: weeklyTotalsByDate.get(key) || 0,
          };
        });

        return {
          date: dateStr,
          netSalary,
          salaryMonth,
          budgetedTotal,
          disposableMonthly,
          dailyAllowance,
          daysRemaining,
          recurringDebtsTotal,
          recurringDebts,
          weeklySpending,
          transactions: dayTransactions.map((t) => ({
            id: String(t._id),
            title: t.title,
            category: t.category,
            amount: t.amount,
            kind: t.kind,
            transactionDate: new Date(t.transactionDate).toISOString(),
            source: t.recurringExpenseId ? "recurring" : "manual",
          })),
          todaySpending,
          monthSpending,
          budgetProgress,
          categories: filteredCategoryNames,
          upcomingBills: upcomingRecurring.map((item) => ({
            id: String(item._id),
            name: item.name,
            amount: item.amount,
            category: item.category,
            nextDueDate: item.nextDueDate ? new Date(item.nextDueDate).toISOString() : null,
            recurrenceRule: item.recurrenceRule,
          })),
        };
      } catch (error) {
        console.error("Daily tracking error:", error);
        return {
          date: new Date().toISOString().split("T")[0],
          netSalary: 0,
          salaryMonth: null,
          budgetedTotal: 0,
          disposableMonthly: 0,
          dailyAllowance: 0,
          daysRemaining: 0,
          recurringDebtsTotal: 0,
          recurringDebts: [],
          weeklySpending: [],
          transactions: [],
          todaySpending: 0,
          monthSpending: 0,
          budgetProgress: [],
          categories: ["Housing", "Food", "Transportation", "Utilities", "Entertainment", "Savings", "Other"],
          upcomingBills: [],
        };
      }
    },
  };
}
