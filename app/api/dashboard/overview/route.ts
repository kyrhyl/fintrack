import { fail, ok } from "@/lib/api";
import { isValidMonthKey, toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { applyAllocationStrategy, calculateAllocationBalance, computeBudgetActuals, roundMoney } from "@/lib/services/budget";
import { buildIncomeSummary } from "@/lib/services/income-summary";
import { buildNetWorthBreakdown } from "@/lib/services/net-worth";
import { Asset } from "@/models/Investment";
import { BudgetPlan } from "@/models/BudgetPlan";
import { Liability } from "@/models/Liability";
import { RecurringExpense } from "@/models/RecurringExpense";
import { Transaction } from "@/models/Transaction";

function monthDateRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  return { start, end };
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

function sumByLabel(items: Array<{ label: string; value: number }>) {
  const map = new Map<string, number>();

  for (const item of items) {
    map.set(item.label, roundMoney((map.get(item.label) || 0) + item.value));
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") || toMonthKey(new Date());

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  await connectToDatabase();

  const { start, end } = monthDateRange(month);
  const now = startOfTodayUtc();
  const next30Days = new Date(now);
  next30Days.setUTCDate(next30Days.getUTCDate() + 30);

  const [
    monthTotals,
    allTimeTotals,
    topExpenseCategories,
    budgetPlan,
    recurringDueSoon,
    monthlyTransactions,
    activeAssets,
    activeLiabilities,
    incomeSummary,
    ] =
    await Promise.all([
      Transaction.aggregate<{ _id: string; total: number }>([
        {
          $match: {
            transactionDate: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: "$kind",
            total: { $sum: "$amount" },
          },
        },
      ]),
      Transaction.aggregate<{ _id: string; total: number }>([
        {
          $group: {
            _id: "$kind",
            total: { $sum: "$amount" },
          },
        },
      ]),
      Transaction.aggregate<{ _id: string; total: number }>([
        {
          $match: {
            kind: "expense",
            transactionDate: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      BudgetPlan.findOne({ month }).lean(),
      RecurringExpense.find({
        isActive: true,
        nextDueDate: { $gte: now, $lte: next30Days },
      })
        .sort({ nextDueDate: 1 })
        .lean(),
      Transaction.find({
        transactionDate: { $gte: start, $lt: end },
      })
        .sort({ transactionDate: -1 })
        .lean(),
      Asset.find({ isActive: true }).lean(),
      Liability.find({ isActive: true }).lean(),
      buildIncomeSummary(month, { connect: false }),
    ]);

  const monthExpenses = roundMoney(
    monthTotals.find((item) => item._id === "expense")?.total || 0,
  );

  const allTimeIncome = roundMoney(
    allTimeTotals.find((item) => item._id === "income")?.total || 0,
  );
  const allTimeExpenses = roundMoney(
    allTimeTotals.find((item) => item._id === "expense")?.total || 0,
  );
  const netCashPosition = roundMoney(allTimeIncome - allTimeExpenses);

  const plannedTotal = roundMoney(
    (budgetPlan?.categories || []).reduce(
      (sum: number, category: { plannedAmount?: number }) => sum + (category.plannedAmount || 0),
      0,
    ),
  );
  const allocationBalance = budgetPlan
    ? calculateAllocationBalance(budgetPlan.plannedIncome, plannedTotal)
    : 0;
  const budgetUtilizationPercent =
    plannedTotal > 0 ? roundMoney((monthExpenses / plannedTotal) * 100) : 0;

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

  const recurringDebtItems = (activeLiabilities || [])
    .filter((item) => !salaryDeductionNames.has((item.name || "").trim().toLowerCase()))
    .map((item) => {
      const payment = item.monthlyPayment && item.monthlyPayment > 0 ? item.monthlyPayment : item.monthlyAmortization || 0;
      return {
        label: item.name || "Recurring Debt",
        value: payment,
      };
    })
    .filter((item) => item.value > 0);
  const recurringDebtTotal = roundMoney(recurringDebtItems.reduce((sum, item) => sum + item.value, 0));

  const activeIncomeRows = sumByLabel(
    [
      { label: "Salary", value: incomeSummary.totals.salaryGross },
      { label: "Other Active", value: incomeSummary.totals.otherActive },
    ].filter((item) => item.value > 0),
  );
  const passiveIncomeRows = sumByLabel(
    [
      { label: "Investments", value: incomeSummary.totals.investmentInterest },
      { label: "Other Passive", value: incomeSummary.totals.otherPassive },
    ].filter((item) => item.value > 0),
  );
  const expenseRows = sumByLabel(
    monthlyTransactions
      .filter((item) => item.kind === "expense")
      .map((item) => ({ label: item.category, value: item.amount })),
  ).map((item) => ({
    ...item,
    percentage: monthExpenses > 0 ? Math.round((item.value / monthExpenses) * 100) : 0,
  }));

  const actualByCategory = monthlyTransactions
    .filter((item) => item.kind === "expense")
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

  const activeIncomeTotal = roundMoney(incomeSummary.totals.salaryGross + incomeSummary.totals.otherActive);
  const passiveIncomeTotal = roundMoney(incomeSummary.totals.investmentInterest + incomeSummary.totals.otherPassive);
  const totalIncome = roundMoney(activeIncomeTotal + passiveIncomeTotal);

  const expenseBaseTotal = budgetActuals.length > 0 ? budgetActualTotal : monthExpenses;
  const statementExpensesTotal = roundMoney(expenseBaseTotal + deductionsTotal + recurringDebtTotal);
  const monthCashFlow = roundMoney(totalIncome - statementExpensesTotal);

  const netWorthBreakdown = buildNetWorthBreakdown(activeAssets, activeLiabilities);

  return ok({
    month,
    kpis: {
      monthIncome: totalIncome,
      monthExpenses: statementExpensesTotal,
      monthCashFlow,
      netCashPosition,
      budgetUtilizationPercent,
      allocationBalance,
    },
    budget: budgetPlan
      ? {
          exists: true,
          status: budgetPlan.status,
          plannedIncome: roundMoney(budgetPlan.plannedIncome || 0),
          plannedTotal,
          categoryCount: (budgetPlan.categories || []).length,
        }
      : {
          exists: false,
        },
    upcomingRecurring: {
      count: recurringDueSoon.length,
      totalAmount: roundMoney(
        recurringDueSoon.reduce((sum, item: { amount?: number }) => sum + (item.amount || 0), 0),
      ),
      items: recurringDueSoon,
    },
    topExpenseCategories: topExpenseCategories.map((item) => ({
      category: item._id,
      total: roundMoney(item.total),
    })),
    statement: {
      asOf: month,
      incomeStatement: {
        activeIncome: activeIncomeRows,
        passiveIncome: passiveIncomeRows,
        expenses: expenseRows,
        totals: {
          activeIncome: activeIncomeTotal,
          passiveIncome: passiveIncomeTotal,
          income: totalIncome,
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
        assets: netWorthBreakdown.assets,
        liabilities: netWorthBreakdown.liabilities,
        totals: {
          assets: netWorthBreakdown.totals.assets,
          assetsIncome: netWorthBreakdown.totals.assetsIncome,
          liabilities: netWorthBreakdown.totals.liabilities,
          liabilitiesPayment: netWorthBreakdown.totals.liabilitiesPayment,
          netWorth: netWorthBreakdown.totals.netWorth,
        },
      },
    },
  });
}
