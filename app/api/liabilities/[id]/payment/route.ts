import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { computeLiabilityValues } from "@/lib/liabilities/calc";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { liabilityPaymentToggleSchema } from "@/lib/validation";
import { Liability } from "@/models/Liability";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PaymentHistoryEntry = {
  monthKey: string;
  paid: boolean;
  paidAt?: Date;
};

function isPaymentHistoryEntry(value: unknown): value is PaymentHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "monthKey" in value && typeof (value as { monthKey?: unknown }).monthKey === "string";
}

function addMonths(date: Date, count: number) {
  const value = new Date(date);
  value.setUTCMonth(value.getUTCMonth() + count);
  return value;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid liability id.", 400);
  }

  try {
    const payload = liabilityPaymentToggleSchema.parse(await request.json());
    const now = new Date();
    const monthKey = toMonthKey(now);

    await connectToDatabase();
    const current = await Liability.findById(id).lean();

    if (!current) {
      return fail("NOT_FOUND", "Liability not found.", 404);
    }

    const computedCurrent = computeLiabilityValues(current, now);
    const currentHistory: PaymentHistoryEntry[] = Array.isArray(current.paymentHistory)
      ? (current.paymentHistory as unknown[])
          .filter((item): item is PaymentHistoryEntry => isPaymentHistoryEntry(item))
          .map((item) => ({ monthKey: item.monthKey, paid: Boolean(item.paid), paidAt: item.paidAt }))
      : [];
    const historyMap = new Map<string, PaymentHistoryEntry>(currentHistory.map((item) => [item.monthKey, item]));

    if (payload.paid) {
      for (let index = 0; index < computedCurrent.dueInstallments; index += 1) {
        const dueMonthKey = toMonthKey(addMonths(computedCurrent.dateIncurred, index));
        historyMap.set(dueMonthKey, {
          monthKey: dueMonthKey,
          paid: true,
          paidAt: now,
        });
      }
    } else {
      historyMap.set(monthKey, {
        monthKey,
        paid: false,
        paidAt: undefined,
      });
    }

    const history: PaymentHistoryEntry[] = Array.from(historyMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const computed = computeLiabilityValues({
      ...current,
      paymentHistory: history,
    }, now);

    const currentStatus = current.status || "on track";
    const currentLastActiveStatus = current.lastActiveStatus || (currentStatus !== "closed" ? currentStatus : "on track");

    let status = currentStatus;
    let isActive = current.isActive;
    let lastActiveStatus = currentLastActiveStatus;

    if (computed.outstandingBalance <= 0) {
      status = "closed";
      isActive = false;
      lastActiveStatus = currentStatus !== "closed" ? currentStatus : currentLastActiveStatus;
    } else if (!payload.paid && currentStatus === "closed") {
      status = currentLastActiveStatus || "on track";
      isActive = true;
      lastActiveStatus = status;
    } else if (currentStatus !== "closed") {
      status = currentStatus;
      isActive = current.isActive ?? true;
      lastActiveStatus = currentStatus;
    }

    const updated = await Liability.findByIdAndUpdate(id, {
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
    }, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    const message = error instanceof Error ? error.message : "Unable to update liability payment status.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
