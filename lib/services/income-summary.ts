import { connectToDatabase } from "@/lib/mongodb";
import { Investment } from "@/models/Investment";
import { IncomeStream } from "@/models/IncomeStream";
import { SalaryRecord } from "@/models/SalaryRecord";

type IncomeSummaryOptions = {
  connect?: boolean;
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

export async function buildIncomeSummary(month: string, options: IncomeSummaryOptions = {}) {
  const shouldConnect = options.connect !== false;
  if (shouldConnect) {
    await connectToDatabase();
  }

  const [salaryForMonth, latestSalary, investments, streams] = await Promise.all([
    SalaryRecord.findOne({ month }).lean(),
    SalaryRecord.findOne().sort({ month: -1 }).lean(),
    Investment.find({ isActive: true }).sort({ currentValue: -1 }).lean(),
    IncomeStream.find({}).sort({ type: 1, monthlyAmount: -1, createdAt: -1 }).lean(),
  ]);

  const salary = salaryForMonth || latestSalary || null;

  const investmentInterest = investments.map((item: {
    _id: unknown;
    name: string;
    institution?: string;
    annualYieldPercent?: number;
    monthlyIncome?: number;
    currentValue?: number;
  }) => {
    const apy = item.annualYieldPercent || 0;
    const monthlyIncome = resolveMonthlyIncome(item.currentValue || 0, apy, item.monthlyIncome);
    return {
      id: String(item._id),
      name: item.name,
      institution: item.institution || "",
      monthlyIncome: Number(monthlyIncome.toFixed(2)),
    };
  });

  const activeStreams = streams.filter((item: { isActive?: boolean; startMonth: string }) => item.isActive && item.startMonth <= month);
  const totalInvestmentInterest = investmentInterest.reduce((sum, item) => sum + item.monthlyIncome, 0);
  const totalOtherActive = activeStreams
    .filter((item: { type: string }) => item.type === "active")
    .reduce((sum: number, item: { monthlyAmount?: number }) => sum + (item.monthlyAmount || 0), 0);
  const totalOtherPassive = activeStreams
    .filter((item: { type: string }) => item.type === "passive")
    .reduce((sum: number, item: { monthlyAmount?: number }) => sum + (item.monthlyAmount || 0), 0);

  const streamRows = streams.map((item: {
    _id: unknown;
    name: string;
    type: "active" | "passive";
    monthlyAmount?: number;
    startMonth: string;
    isActive?: boolean;
    notes?: string;
  }) => ({
    id: String(item._id),
    name: item.name,
    type: item.type,
    monthlyAmount: item.monthlyAmount,
    startMonth: item.startMonth,
    isActive: item.isActive !== false,
    notes: item.notes || "",
  }));

  const salaryNet = salary?.netPay || 0;
  const salaryGross = salary?.grossPay || 0;
  const totals = {
    salaryGross,
    salaryNet,
    investmentInterest: Number(totalInvestmentInterest.toFixed(2)),
    otherActive: Number(totalOtherActive.toFixed(2)),
    otherPassive: Number(totalOtherPassive.toFixed(2)),
    monthlyIncome: Number((salaryNet + totalInvestmentInterest + totalOtherActive + totalOtherPassive).toFixed(2)),
  };

  return {
    month,
    salary,
    investmentInterest,
    streams: streamRows,
    totals,
  };
}
