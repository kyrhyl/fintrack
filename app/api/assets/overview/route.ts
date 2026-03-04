import { ok } from "@/lib/api";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { Asset } from "@/models/Investment";
import { BudgetPlan } from "@/models/BudgetPlan";
import { SalaryRecord } from "@/models/SalaryRecord";
import { Transaction } from "@/models/Transaction";

import type { AssetsData } from "@/types/finance";

type MonthAggregate = {
  _id: string;
  income: number;
  expense: number;
};

function resolveMonthlyIncome(currentValue: number, annualYieldPercent: number, monthlyIncome?: number) {
  if (typeof monthlyIncome === "number" && monthlyIncome > 0) {
    return monthlyIncome;
  }

  if (annualYieldPercent <= 0) {
    return Math.max(monthlyIncome || 0, 0);
  }

  return ((currentValue || 0) * annualYieldPercent) / 100 / 12;
}

function monthRange(month: string) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function GET() {
  await connectToDatabase();

  const currentMonth = toMonthKey(new Date());
  const { start, end } = monthRange(currentMonth);

  const [assets, latestPlan, monthlySeries, passiveIncomeResult, salaryForMonth, latestSalary] = await Promise.all([
    Asset.find({ isActive: true }).sort({ currentValue: -1 }).lean(),
    BudgetPlan.findOne().sort({ month: -1 }).lean(),
    Transaction.aggregate<MonthAggregate>([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$transactionDate",
            },
          },
          income: {
            $sum: {
              $cond: [{ $eq: ["$kind", "income"] }, "$amount", 0],
            },
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ["$kind", "expense"] }, "$amount", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Transaction.aggregate<{ total: number }>([
      {
        $match: {
          kind: "income",
          transactionDate: { $gte: start, $lt: end },
          category: {
            $in: ["savings", "investment", "dividends", "passive", "other"],
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    SalaryRecord.findOne({ month: currentMonth }).lean(),
    SalaryRecord.findOne().sort({ month: -1 }).lean(),
  ]);

  const salaryRecord = salaryForMonth || latestSalary;

  const recentSeries = monthlySeries.slice(-8);
  const initialValue = assets.length > 0 ? assets.reduce((sum, item) => sum + item.currentValue, 0) : 1200000;
  let runningValue = initialValue;
  const trend = recentSeries.map((entry) => {
    runningValue += entry.income - entry.expense;
    return {
      label: entry._id.split("-")[1] || entry._id,
      value: Math.max(0, Math.round(runningValue * 100) / 100),
    };
  });

  const planCategories = Array.isArray(latestPlan?.categories) ? latestPlan.categories : [];
  const sortedCategories = [...planCategories].sort((a, b) => (b.plannedAmount || 0) - (a.plannedAmount || 0));

  const holdingsFromDomain = assets.map((item) => {
    const apy = item.annualYieldPercent || 0;
    const monthlyIncome = resolveMonthlyIncome(item.currentValue || 0, apy, item.monthlyIncome);

    return {
      name: item.name,
      value: Math.max(item.currentValue || 0, 0),
      apy,
      monthlyIncome: Math.max(monthlyIncome, 0),
    };
  });

  const holdings = (holdingsFromDomain.length > 0
    ? holdingsFromDomain
    : (sortedCategories.length > 0
        ? sortedCategories.map((item) => ({
            name: item.name,
            value: (item.plannedAmount || 0) * 12,
            apy: 4,
            monthlyIncome: ((item.plannedAmount || 0) * 12 * 4) / 100 / 12,
          }))
        : [])
  )
    .slice(0, 6)
    .map((holding, index) => {
      const apy = holding.apy || (index === 1 ? 6 : 3);
      return {
        name: holding.name,
        value: Math.max(holding.value, 0),
        apy,
        monthlyIncome: resolveMonthlyIncome(holding.value, apy, holding.monthlyIncome),
      };
    });

  const bankAccountsFromDomain = assets
    .filter((item) => item.isLiquid || item.type === "cash" || item.type === "bank_account")
    .slice(0, 4)
    .map((item) => ({
      name: item.institution || item.name,
      amount: item.currentValue,
    }));

  const bankAccounts =
    bankAccountsFromDomain.length > 0
      ? bankAccountsFromDomain
      : (sortedCategories.length > 0
          ? sortedCategories.slice(0, 4).map((item) => ({ name: item.name, amount: item.plannedAmount || 0 }))
          : []);

  const netWorth = Math.max(0, holdings.reduce((sum, item) => sum + item.value, 0));
  const monthlyDividends =
    passiveIncomeResult[0]?.total || holdings.reduce((sum, item) => sum + item.monthlyIncome, 0);
  const grossPay = Math.max(0, salaryRecord?.grossPay || 0);
  const netPay = Math.max(0, salaryRecord?.netPay || 0);
  const takeHomeRatio =
    typeof salaryRecord?.takeHomeRatio === "number" && salaryRecord.takeHomeRatio > 0
      ? salaryRecord.takeHomeRatio
      : grossPay > 0
      ? (netPay / grossPay) * 100
      : 0;
  const suggestedRatePercent = 20;
  const suggestedAssetBudget = netPay > 0 ? Number((netPay * (suggestedRatePercent / 100)).toFixed(2)) : 0;
  const passiveCoveragePercent = netPay > 0 ? Number(((monthlyDividends / netPay) * 100).toFixed(1)) : 0;

  const payload: AssetsData = {
    title: "Asset Portfolio",
    subtitle: `Detailed breakdown as of ${currentMonth}`,
    summaryCards: [
      { label: "Net Worth", value: netWorth, note: "Calculated from latest portfolio allocations" },
      { label: "Monthly Dividends", value: monthlyDividends, note: "Income from passive and planned yield" },
    ],
    bankAccounts,
    trend: trend.length > 0 ? trend : [{ label: currentMonth.split("-")[1] || currentMonth, value: 0 }],
    holdings,
    salaryInsights: {
      month: salaryRecord?.month || currentMonth,
      grossPay,
      netPay,
      takeHomeRatio: Number(takeHomeRatio.toFixed(1)),
      suggestedAssetBudget,
      suggestedRatePercent,
      passiveIncome: Number(monthlyDividends.toFixed(2)),
      passiveCoveragePercent,
    },
  };

  return ok(payload);
}
