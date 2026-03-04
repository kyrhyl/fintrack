import { fail, ok } from "@/lib/api";
import { isValidMonthKey, toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { calculateAllocationBalance, roundMoney } from "@/lib/services/budget";
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
    ]);

  const monthIncome = roundMoney(
    monthTotals.find((item) => item._id === "income")?.total || 0,
  );
  const monthExpenses = roundMoney(
    monthTotals.find((item) => item._id === "expense")?.total || 0,
  );
  const monthCashFlow = roundMoney(monthIncome - monthExpenses);

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

  const passiveCategories = new Set(["savings", "investment", "dividends", "passive", "rent", "rents", "other"]);
  const activeIncomeRows = sumByLabel(
    monthlyTransactions
      .filter((item) => item.kind === "income" && !passiveCategories.has(item.category.toLowerCase()))
      .map((item) => ({ label: item.title || item.category, value: item.amount })),
  );
  const passiveIncomeRows = sumByLabel(
    monthlyTransactions
      .filter((item) => item.kind === "income" && passiveCategories.has(item.category.toLowerCase()))
      .map((item) => ({ label: item.title || item.category, value: item.amount })),
  );
  const expenseRows = sumByLabel(
    monthlyTransactions
      .filter((item) => item.kind === "expense")
      .map((item) => ({ label: item.category, value: item.amount })),
  ).map((item) => ({
    ...item,
    percentage: monthExpenses > 0 ? Math.round((item.value / monthExpenses) * 100) : 0,
  }));

  const activeIncomeTotal = roundMoney(activeIncomeRows.reduce((sum, item) => sum + item.value, 0));
  const passiveIncomeTotal = roundMoney(passiveIncomeRows.reduce((sum, item) => sum + item.value, 0));

  const netWorthBreakdown = buildNetWorthBreakdown(activeAssets, activeLiabilities);

  return ok({
    month,
    kpis: {
      monthIncome,
      monthExpenses,
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
          income: roundMoney(activeIncomeTotal + passiveIncomeTotal),
          expenses: monthExpenses,
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
