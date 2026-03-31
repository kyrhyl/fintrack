import { ok } from "@/lib/api";
import { computeLiabilityValues } from "@/lib/liabilities/calc";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { Liability } from "@/models/Liability";
import { RecurringExpense } from "@/models/RecurringExpense";
import { Transaction } from "@/models/Transaction";

import type { DebtsData } from "@/types/finance";

function monthRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

function php(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}

function debtLikeCategory(category: string) {
  const normalized = category.toLowerCase();
  return normalized.includes("debt") || normalized.includes("loan") || normalized.includes("credit");
}

export async function GET() {
  await connectToDatabase();

  const currentMonth = toMonthKey(new Date());
  const { start, end } = monthRange(currentMonth);

  const [liabilities, monthlyDebtTransactions, monthIncomeResult, passiveIncomeResult, recurringItems] = await Promise.all([
    Liability.find({ $or: [{ isActive: true }, { status: "closed" }] }).sort({ outstandingBalance: -1 }).lean(),
    Transaction.find({
      kind: "expense",
      transactionDate: { $gte: start, $lt: end },
    })
      .sort({ transactionDate: -1 })
      .lean(),
    Transaction.aggregate<{ total: number }>([
      { $match: { kind: "income", transactionDate: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate<{ total: number }>([
      {
        $match: {
          kind: "income",
          transactionDate: { $gte: start, $lt: end },
          category: { $in: ["savings", "investment", "dividends", "passive", "other"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RecurringExpense.find({ isActive: true }).sort({ nextDueDate: 1 }).lean(),
  ]);

  const debtTransactions = monthlyDebtTransactions.filter((item) => debtLikeCategory(item.category));
  const monthlyPaymentFromTransactions = debtTransactions.reduce((sum, item) => sum + item.amount, 0);

  const loansFromLiabilities = liabilities.map((item) => {
    const computed = computeLiabilityValues(item);
    const status = computed.outstandingBalance <= 0 ? "closed" : item.status;
    const isActive = status === "closed" ? false : item.isActive !== false;
    const progress = computed.totalDebt > 0
      ? Math.round(((computed.totalDebt - computed.outstandingBalance) / computed.totalDebt) * 100)
      : 0;

    return {
      id: String(item._id),
      name: item.name,
      category: item.category,
      outstandingDebt: computed.outstandingBalance,
      totalDebt: computed.outstandingBalance,
      monthly: computed.monthlyAmortization,
      progress: Math.min(100, Math.max(0, progress)),
      status,
      isActive,
      dateIncurred: computed.dateIncurred.toISOString(),
      termMonths: computed.termMonths,
      paidThisMonth: computed.currentMonthPaid,
      overdueInstallments: computed.overdueInstallments,
    };
  });

  const activeLoans = loansFromLiabilities.filter((item) => item.isActive && item.status !== "closed");
  const loans = [...activeLoans, ...loansFromLiabilities.filter((item) => !item.isActive || item.status === "closed")];

  const totalDebt = activeLoans.reduce((sum, item) => sum + item.outstandingDebt, 0);
  const monthlyPaymentFromLiabilities = activeLoans.reduce(
    (sum, item) => sum + item.monthly,
    0,
  );
  const monthlyPayment = monthlyPaymentFromTransactions > 0 ? monthlyPaymentFromTransactions : monthlyPaymentFromLiabilities;
  const monthlyIncome = monthIncomeResult[0]?.total || 0;
  const passiveIncome = passiveIncomeResult[0]?.total || 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? Math.round((monthlyPayment / monthlyIncome) * 100) : 0;
  const debtToPassive = passiveIncome > 0 ? Math.round((monthlyPayment / passiveIncome) * 100) : 0;

  const recurringBills = recurringItems
    .filter((item) => !debtLikeCategory(item.category))
    .slice(0, 4)
    .map((item) => ({ name: item.name, amount: item.amount }));

  const totalPrincipal = activeLoans.reduce((sum, item) => sum + (item.monthly * item.termMonths), 0);
  const projectionProgress =
    totalPrincipal > 0 ? Math.min(98, Math.round(((totalPrincipal - totalDebt) / totalPrincipal) * 100)) : 0;

  const monthsToDebtFree = monthlyPayment > 0 ? Math.ceil(totalDebt / monthlyPayment) : 0;
  const projectedDate = new Date();
  projectedDate.setUTCMonth(projectedDate.getUTCMonth() + monthsToDebtFree);
  const debtFreeBy = monthsToDebtFree > 0
    ? projectedDate.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : "Debt-free now";

  const payload: DebtsData = {
    title: "Liability & Debt Repayment",
    subtitle: `As of ${currentMonth}`,
    stats: [
      {
        label: "Outstanding Debt",
        value: php(totalDebt),
        note: "Estimated from active debt obligations",
        tone: "danger",
      },
      {
        label: "Monthly Payment",
        value: php(monthlyPayment),
        note: "Derived from this month debt transactions",
        tone: "default",
      },
      {
        label: "Debt to Passive Income",
        value: `${debtToPassive}%`,
        note: debtToPassive > 250 ? "Critical" : "Watchlist",
        tone: debtToPassive > 250 ? "danger" : "warning",
      },
      {
        label: "Debt to Income Ratio",
        value: `${debtToIncomeRatio}%`,
        note: debtToIncomeRatio > 40 ? "Moderate" : "Stable",
        tone: debtToIncomeRatio > 40 ? "warning" : "default",
      },
    ],
    loans,
    recurringBills,
    projection: {
      debtFreeBy,
      progress: projectionProgress,
      remainingMonths: monthsToDebtFree,
    },
  };

  return ok(payload);
}
