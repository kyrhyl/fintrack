import { fail, ok } from "@/lib/api";
import { isValidMonthKey, toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { roundMoney } from "@/lib/services/budget";
import { SalaryRecord } from "@/models/SalaryRecord";

import type { SalaryOverviewData } from "@/types/finance";

type EarningItem = {
  name: string;
  amount: number;
  isTaxable: boolean;
};

type DeductionItem = {
  name: string;
  amount: number;
  category: string;
  liabilityId?: string;
  applied?: boolean;
  appliedAt?: Date;
  reconcileNote?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") || toMonthKey(new Date());

  if (!isValidMonthKey(month)) {
    return fail("BAD_REQUEST", "Invalid month key. Use YYYY-MM.", 400);
  }

  await connectToDatabase();

  const record =
    (await SalaryRecord.findOne({ month }).lean()) ||
    (await SalaryRecord.findOne().sort({ month: -1 }).lean());

  if (!record) {
    return ok({ month, exists: false });
  }

  const earnings: EarningItem[] = Array.isArray(record.earnings) ? record.earnings : [];
  const deductions: DeductionItem[] = Array.isArray(record.deductions) ? record.deductions : [];
  const loanDeductions: DeductionItem[] = Array.isArray(record.loanDeductions)
    ? record.loanDeductions
    : [];

  const earningsTotal = roundMoney(earnings.reduce((sum: number, item) => sum + (item.amount || 0), 0));
  const deductionsTotal = roundMoney(
    deductions.reduce((sum: number, item) => sum + (item.amount || 0), 0),
  );
  const loanDeductionsTotal = roundMoney(
    loanDeductions.reduce((sum: number, item) => sum + (item.amount || 0), 0),
  );
  const grossPay = roundMoney(record.grossPay || earningsTotal);
  const netPay = roundMoney(record.netPay || 0);
  const computedTakeHomeRatio = roundMoney((netPay / Math.max(grossPay, 1)) * 100);
  const takeHomeRatio =
    typeof record.takeHomeRatio === "number" && record.takeHomeRatio > 0
      ? roundMoney(record.takeHomeRatio)
      : computedTakeHomeRatio;

  const payload: SalaryOverviewData = {
    month: record.month,
    grossPay,
    netPay,
    takeHomeRatio,
    earningsTotal,
    deductionsTotal,
    loanDeductionsTotal,
    earnings: earnings.map((item) => ({
      name: item.name,
      amount: roundMoney(item.amount || 0),
      isTaxable: Boolean(item.isTaxable),
    })),
    deductions: deductions.map((item) => ({
      name: item.name,
      amount: roundMoney(item.amount || 0),
      category: item.category,
    })),
    loanDeductions: loanDeductions.map((item) => ({
      name: item.name,
      amount: roundMoney(item.amount || 0),
      category: item.category,
      liabilityId: item.liabilityId || undefined,
      applied: Boolean(item.applied),
      appliedAt: item.appliedAt ? new Date(item.appliedAt).toISOString() : undefined,
      reconcileNote: item.reconcileNote || undefined,
    })),
  };

  return ok({ exists: true, data: payload });
}
