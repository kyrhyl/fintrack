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
    deductions?: {
      items: Array<{ label: string; value: number }>;
      total: number;
    };
    recurringDebt?: {
      items: Array<{ label: string; value: number }>;
      total: number;
    };
    budgetActuals?: {
      plannedTotal: number;
      actualTotal: number;
      utilizationPercent: number;
      categories: Array<{
        label: string;
        planned: number;
        actual: number;
        variance: number;
        percentUsed: number;
        overBudget: boolean;
      }>;
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

export type StockPosition = {
  id: string;
  name: string;
  symbol: string;
  exchange: string;
  shares: number;
  averageCost: number;
  lastPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastPriceAt?: string;
  priceSource?: string;
};

export type StockHolding = {
  _id: string;
  name: string;
  symbol: string;
  exchange: string;
  shares: number;
  averageCost: number;
  lastPrice?: number;
  lastPriceAt?: string;
  priceSource?: string;
  notes?: string;
  isActive: boolean;
};

export type StockPortfolioData = {
  title: string;
  subtitle: string;
  summaryCards: Array<{ label: string; value: number; note: string }>;
  trend: TrendPoint[];
  positions: StockPosition[];
  latestMonth: string | null;
  previousMonth: string | null;
  asOf: string;
};

export type StockCaptureResult = {
  month: string;
  capturedCount: number;
  failedSymbols: string[];
};

export type DebtsData = {
  title: string;
  subtitle: string;
  stats: Array<{ label: string; value: string; note: string; tone: "default" | "danger" | "warning" }>;
  loans: Array<{
    id?: string;
    name: string;
    category?: string;
    outstandingDebt: number;
    totalDebt?: number;
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
  points: Array<{
    label: string;
    month: string;
    value: number;
    assetsTotal: number;
    liabilitiesTotal: number;
  }>;
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
    assetsTotal: number;
    liabilitiesTotal: number;
    capturedAt: string;
  } | null;
  delta: number;
  deltaPercent: number;
  isCurrentMonthCaptured: boolean;
};

export type DailyTrackingData = {
  date: string;
  netSalary: number;
  salaryMonth: string | null;
  budgetedTotal: number;
  disposableMonthly: number;
  dailyAllowance: number;
  daysRemaining: number;
  recurringDebtsTotal: number;
  recurringDebts: Array<{
    id: string;
    name: string;
    category: string;
    monthlyPayment: number;
    outstandingBalance: number;
    status: string;
  }>;
  weeklySpending: Array<{
    date: string;
    label: string;
    amount: number;
  }>;
  transactions: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    kind: "income" | "expense";
    transactionDate: string;
    source: "manual" | "recurring";
  }>;
  todaySpending: number;
  monthSpending: number;
  budgetProgress: Array<{
    category: string;
    planned: number;
    actual: number;
    remaining: number;
    percentUsed: number;
  }>;
  categories: string[];
  upcomingBills: Array<{
    id: string;
    name: string;
    amount: number;
    category: string;
    nextDueDate: string | null;
    recurrenceRule: "monthly" | "quarterly" | "yearly";
  }>;
};
