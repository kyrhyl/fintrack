import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { isValidMonthKey, toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { Investment } from "@/models/Investment";
import { IncomeStream } from "@/models/IncomeStream";
import { Liability } from "@/models/Liability";
import { SalaryRecord } from "@/models/SalaryRecord";

function resolveMonthlyIncome(currentValue: number, annualYieldPercent: number, monthlyIncome?: number) {
  if (typeof monthlyIncome === "number" && monthlyIncome > 0) {
    return monthlyIncome;
  }

  if (annualYieldPercent <= 0) {
    return Math.max(monthlyIncome || 0, 0);
  }

  return ((currentValue || 0) * annualYieldPercent) / 100 / 12;
}

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const month = url.searchParams.get("month") || toMonthKey(new Date());

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  await connectToDatabase();

  const [salaryForMonth, latestSalary, investments, streams, liabilities] = await Promise.all([
    SalaryRecord.findOne({ month }).lean(),
    SalaryRecord.findOne().sort({ month: -1 }).lean(),
    Investment.find({ isActive: true }).sort({ currentValue: -1 }).lean(),
    IncomeStream.find({}).sort({ type: 1, monthlyAmount: -1, createdAt: -1 }).lean(),
    Liability.find({ isActive: true }).sort({ monthlyPayment: -1, outstandingBalance: -1 }).lean(),
  ]);

  const salary = salaryForMonth || latestSalary;

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

  return ok({
    month,
    salary: salary
      ? {
          id: String(salary._id),
          month: salary.month,
          grossPay: salary.grossPay || 0,
          netPay: salary.netPay || 0,
          takeHomeRatio:
            typeof salary.takeHomeRatio === "number" && salary.takeHomeRatio > 0
              ? salary.takeHomeRatio
              : salary.grossPay > 0
              ? (salary.netPay / salary.grossPay) * 100
              : 0,
          earnings: salary.earnings || [],
          deductions: salary.deductions || [],
          loanDeductions: (salary.loanDeductions || []).map((item: {
            name: string;
            amount: number;
            category: string;
            liabilityId?: string;
            applied?: boolean;
            appliedAt?: Date;
            reconcileNote?: string;
          }) => ({
            name: item.name,
            amount: item.amount,
            category: item.category,
            liabilityId: item.liabilityId || "",
            applied: Boolean(item.applied),
            appliedAt: item.appliedAt ? new Date(item.appliedAt).toISOString() : undefined,
            reconcileNote: item.reconcileNote || "",
          })),
          notes: salary.notes || "",
        }
      : null,
    investmentInterest,
    streams: streams.map((item: {
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
    })),
    liabilityOptions: liabilities.map((item: {
      _id: unknown;
      name: string;
      monthlyAmortization?: number;
      monthlyPayment?: number;
      outstandingBalance?: number;
    }) => ({
      id: String(item._id),
      name: item.name,
      monthlyPayment: item.monthlyAmortization || item.monthlyPayment || 0,
      outstandingBalance: item.outstandingBalance || 0,
    })),
    totals: {
      salaryNet: salary?.netPay || 0,
      investmentInterest: Number(totalInvestmentInterest.toFixed(2)),
      otherActive: Number(totalOtherActive.toFixed(2)),
      otherPassive: Number(totalOtherPassive.toFixed(2)),
      monthlyIncome:
        Number(((salary?.netPay || 0) + totalInvestmentInterest + totalOtherActive + totalOtherPassive).toFixed(2)),
    },
  });
}
