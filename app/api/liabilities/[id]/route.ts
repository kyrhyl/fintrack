import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { computeLiabilityValues } from "@/lib/liabilities/calc";
import { connectToDatabase } from "@/lib/mongodb";
import { liabilityUpdateSchema } from "@/lib/validation";
import { Liability } from "@/models/Liability";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid liability id.", 400);
  }

  try {
    const payload = liabilityUpdateSchema.parse(await request.json());

    await connectToDatabase();
    const current = await Liability.findById(id).lean();

    if (!current) {
      return fail("NOT_FOUND", "Liability not found.", 404);
    }

    const merged = {
      ...current,
      ...payload,
      paymentHistory: payload.paymentHistory ?? current.paymentHistory,
    };

    const computed = computeLiabilityValues(merged);
    const mergedStatus = payload.status ?? current.status;
    const currentLastActiveStatus = current.lastActiveStatus || (current.status !== "closed" ? current.status : "on track");

    let status = mergedStatus;
    let isActive = payload.isActive ?? current.isActive;
    let lastActiveStatus = payload.lastActiveStatus ?? currentLastActiveStatus;

    if (computed.outstandingBalance <= 0) {
      status = "closed";
      isActive = false;
      lastActiveStatus = payload.lastActiveStatus
        || (payload.status && payload.status !== "closed" ? payload.status : currentLastActiveStatus);
    } else if (status === "closed") {
      status = lastActiveStatus || "on track";
      isActive = true;
      lastActiveStatus = status;
    } else {
      isActive = true;
      lastActiveStatus = status;
    }

    const updated = await Liability.findByIdAndUpdate(id, {
      ...payload,
      status,
      isActive,
      lastActiveStatus,
      dateIncurred: computed.dateIncurred,
      startDate: computed.dateIncurred,
      monthlyAmortization: computed.monthlyAmortization,
      monthlyPayment: computed.monthlyAmortization,
      principal: computed.totalDebt,
      termMonths: computed.termMonths,
      outstandingBalance: computed.outstandingBalance,
      paidInstallmentsCount: computed.paidInstallments,
    }, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    const message = error instanceof Error ? error.message : "Unable to update liability.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return fail("BAD_REQUEST", "Invalid liability id.", 400);
  }

  await connectToDatabase();
  const deleted = await Liability.findByIdAndDelete(id).lean();

  if (!deleted) {
    return fail("NOT_FOUND", "Liability not found.", 404);
  }

  return ok({ id, deleted: true });
}
