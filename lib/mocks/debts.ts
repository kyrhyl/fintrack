import type { DebtsData } from "@/types/finance";

export const debtsMock: DebtsData = {
  title: "Liability & Debt Repayment",
  subtitle: "As of February 20, 2026",
  stats: [
    { label: "Total Debt", value: "PHP 324,662.74", note: "Decreased by 4.2% from last month", tone: "danger" },
    { label: "Monthly Payment", value: "PHP 24,159.96", note: "Next payment due in 5 days", tone: "default" },
    { label: "Debt to Passive Income", value: "282%", note: "Critical", tone: "danger" },
    { label: "Debt to Income Ratio", value: "41%", note: "Moderate", tone: "warning" },
  ],
  loans: [
    { name: "GSIS Conso", category: "loan", outstandingDebt: 130099.2, monthly: 1792, progress: 0, status: "newly opened" },
    { name: "GSIS Policy Loan", category: "loan", outstandingDebt: 22000, monthly: 2000, progress: 45, status: "on track" },
    { name: "Laptop Computer", category: "credit_card", outstandingDebt: 27492, monthly: 4582, progress: 50, status: "on track" },
    { name: "Balance Conversion", category: "credit_card", outstandingDebt: 18207.42, monthly: 1655.22, progress: 69, status: "halfway there" },
  ],
  recurringBills: [
    { name: "Globe", amount: 1000 },
    { name: "Netflix", amount: 549 },
    { name: "Scribd", amount: 129 },
    { name: "TRF", amount: 49 },
  ],
  projection: {
    debtFreeBy: "Oct 2031",
    progress: 14,
    remainingMonths: 68,
  },
};
