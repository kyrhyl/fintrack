import { ZodError } from "zod";
import { isValidObjectId } from "mongoose";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { computeLiabilityValues } from "@/lib/liabilities/calc";
import { isValidMonthKey, toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { salaryUpsertSchema } from "@/lib/validation";
import { Liability } from "@/models/Liability";
import { SalaryRecord } from "@/models/SalaryRecord";

type LoanDeductionPayload = {
  name: string;
  amount: number;
  category: string;
  liabilityId?: string;
  applied?: boolean;
  appliedAt?: Date;
  reconcileNote?: string;
};

function monthToStamp(month: string) {
  const [year, monthValue] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthValue - 1, 1, 12, 0, 0, 0));
}

function normalizeHistory(history: unknown) {
  const map = new Map<string, { monthKey: string; paid: boolean; paidAt?: Date }>();

  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const monthKey = typeof (item as { monthKey?: unknown }).monthKey === "string"
        ? (item as { monthKey: string }).monthKey
        : null;
      if (!monthKey) {
        continue;
      }

      map.set(monthKey, {
        monthKey,
        paid: Boolean((item as { paid?: unknown }).paid),
        paidAt:
          (item as { paidAt?: unknown }).paidAt instanceof Date
            ? (item as { paidAt: Date }).paidAt
            : undefined,
      });
    }
  }

  return map;
}

async function reconcileLoanDeductions(month: string, loanDeductions: LoanDeductionPayload[]) {
  const toApply = loanDeductions.filter((item) => item.liabilityId && isValidObjectId(item.liabilityId));
  if (toApply.length === 0) {
    return loanDeductions.map((item) => ({ ...item, applied: false, appliedAt: undefined, reconcileNote: "Not linked" }));
  }

  const ids = Array.from(new Set(toApply.map((item) => item.liabilityId as string)));
  const liabilities = await Liability.find({ _id: { $in: ids } }).lean();
  const liabilityMap = new Map(liabilities.map((item) => [String(item._id), item]));
  const stamp = monthToStamp(month);

  const results = new Map<string, { applied: boolean; appliedAt?: Date; reconcileNote?: string }>();

  for (const row of toApply) {
    const liabilityId = row.liabilityId as string;
    const liability = liabilityMap.get(liabilityId);

    if (!liability) {
      results.set(liabilityId, { applied: false, reconcileNote: "Mapped liability not found" });
      continue;
    }

    const historyMap = normalizeHistory(liability.paymentHistory);
    const previous = historyMap.get(month);
    historyMap.set(month, { monthKey: month, paid: true, paidAt: stamp });
    const history = Array.from(historyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const computed = computeLiabilityValues({
      ...liability,
      paymentHistory: history,
    });

    const currentStatus = liability.status || "on track";
    const currentLastActiveStatus =
      liability.lastActiveStatus || (currentStatus !== "closed" ? currentStatus : "on track");

    let status = currentStatus;
    let isActive = liability.isActive;
    let lastActiveStatus = currentLastActiveStatus;

    if (computed.outstandingBalance <= 0) {
      status = "closed";
      isActive = false;
      lastActiveStatus = currentStatus !== "closed" ? currentStatus : currentLastActiveStatus;
    } else if (currentStatus === "closed") {
      status = currentLastActiveStatus || "on track";
      isActive = true;
      lastActiveStatus = status;
    }

    await Liability.findByIdAndUpdate(
      liabilityId,
      {
        paymentHistory: history,
        principal: computed.totalDebt,
        monthlyAmortization: computed.monthlyAmortization,
        monthlyPayment: computed.monthlyAmortization,
        termMonths: computed.termMonths,
        outstandingBalance: computed.outstandingBalance,
        paidInstallmentsCount: computed.paidInstallments,
        status,
        isActive,
        lastActiveStatus,
      },
      { runValidators: true },
    );

    results.set(liabilityId, {
      applied: true,
      appliedAt: previous?.paid ? previous.paidAt || stamp : stamp,
      reconcileNote: "Applied to liability",
    });
  }

  return loanDeductions.map((item) => {
    if (!item.liabilityId || !isValidObjectId(item.liabilityId)) {
      return {
        ...item,
        applied: false,
        appliedAt: undefined,
        reconcileNote: item.liabilityId ? "Invalid liability mapping" : "Not linked",
      };
    }

    const result = results.get(item.liabilityId);
    return {
      ...item,
      applied: result?.applied || false,
      appliedAt: result?.appliedAt,
      reconcileNote: result?.reconcileNote || "Not linked",
    };
  });
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
  const record = await SalaryRecord.findOne({ month }).lean();

  return ok({ exists: Boolean(record), data: record || null, month });
}

export async function PUT(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = salaryUpsertSchema.parse(await request.json());
    const earningsTotal = payload.earnings.reduce((sum, row) => sum + (row.amount || 0), 0);
    const deductionsTotal =
      payload.deductions.reduce((sum, row) => sum + (row.amount || 0), 0) +
      payload.loanDeductions.reduce((sum, row) => sum + (row.amount || 0), 0);
    const effectiveGrossPay = payload.grossPay > 0 ? payload.grossPay : earningsTotal;
    const effectiveNetPay = payload.netPay > 0 ? payload.netPay : Math.max(effectiveGrossPay - deductionsTotal, 0);
    const computedRatio = effectiveGrossPay > 0 ? (effectiveNetPay / effectiveGrossPay) * 100 : 0;
    const takeHomeRatio = typeof payload.takeHomeRatio === "number" ? payload.takeHomeRatio : computedRatio;

    await connectToDatabase();
    const reconciledLoanDeductions = await reconcileLoanDeductions(payload.month, payload.loanDeductions);

    const saved = await SalaryRecord.findOneAndUpdate(
      { month: payload.month },
      {
        ...payload,
        grossPay: effectiveGrossPay,
        netPay: effectiveNetPay,
        takeHomeRatio,
        loanDeductions: reconciledLoanDeductions,
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      },
    ).lean();

    return ok(saved);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    const message = error instanceof Error ? error.message : "Unable to save salary record.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
