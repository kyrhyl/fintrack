import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { computeLiabilityValues } from "@/lib/liabilities/calc";
import { connectToDatabase } from "@/lib/mongodb";
import { liabilityCreateSchema } from "@/lib/validation";
import { Liability } from "@/models/Liability";

export async function GET() {
  await connectToDatabase();
  const items = await Liability.find().sort({ isActive: -1, outstandingBalance: -1 }).lean();
  return ok({ items, total: items.length });
}

export async function POST(request: Request) {
  try {
    const payload = liabilityCreateSchema.parse(await request.json());
    const computed = computeLiabilityValues(payload);
    const status = payload.status === "closed" ? "closed" : payload.status;
    const isActive = status === "closed" ? false : payload.isActive;
    const lastActiveStatus = payload.lastActiveStatus || (status === "closed" ? "on track" : status);

    await connectToDatabase();
    const created = await Liability.create({
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
    });

    return ok(created.toObject(), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    const message = error instanceof Error ? error.message : "Unable to create liability.";
    return fail("INTERNAL_ERROR", message, 500);
  }
}
