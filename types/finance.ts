export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export type AllocationStrategy = "fixed" | "variable" | "percentage";
export type BudgetPlanStatus = "draft" | "locked";
export type Recurrence = "monthly" | "quarterly" | "yearly";

export type TransactionKind = "income" | "expense";

export type TransactionCategory =
  | "debt"
  | "personal"
  | "savings"
  | "medical"
  | "utilities"
  | "subscriptions"
  | "rent"
  | "insurance"
  | "transport"
  | "other";

export type BudgetCategoryType = "fixed" | "variable" | "percentage";

export type MonthKey = `${number}-${number}`;

export type TrendPoint = {
  label: string;
  value: number;
};

export type DashboardMetric = {
  label: string;
  value: number;
  note: string;
  tone: "default" | "success" | "danger";
};

export type DashboardTransaction = {
  name: string;
  category: string;
  date: string;
  amount: number;
};

export type DashboardLiability = {
  item: string;
  principal: number;
  payment: number;
  status: string;
};

export type DashboardData = {
  title: string;
  subtitle: string;
  financialSummary?: {
    totalIncome: number;
    totalExpenses: number;
    activeIncome: number;
    passiveIncome: number;
  };
  incomeStatement?: {
    activeIncome: Array<{ label: string; value: number }>;
    passiveIncome: Array<{ label: string; value: number }>;
    expenses: Array<{ label: string; percentage: number; value: number }>;
    totals: {
      activeIncome: number;
      passiveIncome: number;
      income: number;
      expenses: number;
    };
  };
  balanceSheet?: {
    assets: Array<{ label: string; value: number; income: number }>;
    liabilities: Array<{ label: string; debt: number; payment: number }>;
    totals: {
      assets: number;
      assetsIncome: number;
      liabilities: number;
      liabilitiesPayment: number;
      netWorth: number;
    };
  };
  metrics: DashboardMetric[];
  transactions: DashboardTransaction[];
  liabilities: DashboardLiability[];
  spendingMix: Array<{ label: string; percentage: number }>;
};

export type AssetsData = {
  title: string;
  subtitle: string;
  summaryCards: Array<{ label: string; value: number; note: string }>;
  bankAccounts: Array<{ name: string; amount: number }>;
  trend: TrendPoint[];
  holdings: Array<{ name: string; value: number; apy: number; monthlyIncome: number }>;
  salaryInsights?: {
    month: string;
    grossPay: number;
    netPay: number;
    takeHomeRatio: number;
    suggestedAssetBudget: number;
    suggestedRatePercent: number;
    passiveIncome: number;
    passiveCoveragePercent: number;
  };
};

export type InvestmentsData = AssetsData;

export type DebtsData = {
  title: string;
  subtitle: string;
  stats: Array<{ label: string; value: string; note: string; tone: "default" | "danger" | "warning" }>;
  loans: Array<{
    id?: string;
    name: string;
    category?: string;
    totalDebt: number;
    monthly: number;
    progress: number;
    status: string;
    isActive?: boolean;
    dateIncurred?: string;
    termMonths?: number;
    paidThisMonth?: boolean;
    overdueInstallments?: number;
  }>;
  recurringBills: Array<{ name: string; amount: number }>;
  projection: {
    debtFreeBy: string;
    progress: number;
    remainingMonths: number;
  };
};

export type SalaryOverviewData = {
  month: string;
  grossPay: number;
  netPay: number;
  takeHomeRatio: number;
  earningsTotal: number;
  deductionsTotal: number;
  loanDeductionsTotal: number;
  earnings: Array<{ name: string; amount: number; isTaxable: boolean }>;
  deductions: Array<{ name: string; amount: number; category: string }>;
  loanDeductions: Array<{
    name: string;
    amount: number;
    category: string;
    liabilityId?: string;
    applied?: boolean;
    appliedAt?: string;
    reconcileNote?: string;
  }>;
};

export type NetWorthTrendData = {
  points: Array<{ label: string; month: string; value: number }>;
  latest: {
    month: string;
    value: number;
    assetsTotal: number;
    liabilitiesTotal: number;
    capturedAt: string;
  } | null;
  previous: {
    month: string;
    value: number;
    capturedAt: string;
  } | null;
  delta: number;
  deltaPercent: number;
  isCurrentMonthCaptured: boolean;
};
