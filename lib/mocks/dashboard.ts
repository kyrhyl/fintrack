import type { DashboardData } from "@/types/finance";

export const dashboardMock: DashboardData = {
  title: "Personal Finance Overview",
  subtitle: "As of February 20, 2026",
  financialSummary: {
    totalIncome: 58865.42,
    totalExpenses: 36659.96,
    activeIncome: 50312.03,
    passiveIncome: 8553.39,
  },
  incomeStatement: {
    activeIncome: [
      { label: "Salary", value: 37645.37 },
      { label: "Business", value: 12666.66 },
    ],
    passiveIncome: [
      { label: "Dividends", value: 8553.39 },
    ],
    expenses: [
      { label: "Savings", percentage: 11, value: 4000 },
      { label: "Debt", percentage: 65, value: 24159.96 },
      { label: "Personal", percentage: 24, value: 9000 },
    ],
    totals: {
      activeIncome: 50312.03,
      passiveIncome: 8553.39,
      income: 58865.42,
      expenses: 37159.96,
    },
  },
  balanceSheet: {
    assets: [
      { label: "Cash in hand", value: 40000, income: 0 },
      { label: "Banks Accounts", value: 92830, income: 193.4 },
      { label: "Cooperative", value: 115211.88, income: 366.67 },
      { label: "Personal Assets", value: 500000, income: 0 },
      { label: "Stocks/Funds/Insurance", value: 1890900.41, income: 7994.56 },
    ],
    liabilities: [
      { label: "GSIS Conso", debt: 130099.2, payment: 1792 },
      { label: "GSIS Policy Loan", debt: 22000, payment: 2000 },
      { label: "Laptop Computer", debt: 27492, payment: 4582 },
      { label: "Balance Conversion", debt: 18207.42, payment: 1655.22 },
    ],
    totals: {
      assets: 2638942.29,
      assetsIncome: 8554.63,
      liabilities: 197798.62,
      liabilitiesPayment: 10029.22,
      netWorth: 2441143.67,
    },
  },
  metrics: [
    { label: "Net Worth", value: 2323690.09, note: "+2.4% from last month", tone: "success" },
    { label: "Liquid Funds", value: 2148352.83, note: "Available for withdrawal", tone: "default" },
    { label: "Monthly Cash Flow", value: 22205.46, note: "Income - Expenses", tone: "success" },
    { label: "Cash on Hand", value: 142240.54, note: "Physical + bank balances", tone: "default" },
  ],
  transactions: [
    { name: "Pet Supplies & Food", category: "Personal", date: "Feb 20, 2026", amount: 6000 },
    { name: "Retirement Contribution", category: "Savings", date: "Feb 18, 2026", amount: 4000 },
    { name: "GSIS Conso Loan", category: "Debt", date: "Feb 15, 2026", amount: 1792 },
    { name: "Fiber Internet Bill", category: "Personal", date: "Feb 12, 2026", amount: 1500 },
    { name: "Monthly Medical Fund", category: "Medical", date: "Feb 10, 2026", amount: 2500 },
  ],
  liabilities: [
    { item: "GSIS Conso Loan", principal: 130099.2, payment: 1792, status: "newly opened" },
    { item: "Balance Conversion", principal: 96171.24, payment: 2914.28, status: "halfway there" },
    { item: "Laptop Equipment", principal: 27492, payment: 4582, status: "on track" },
  ],
  spendingMix: [
    { label: "Debt", percentage: 66 },
    { label: "Personal", percentage: 23 },
    { label: "Savings", percentage: 11 },
  ],
};
