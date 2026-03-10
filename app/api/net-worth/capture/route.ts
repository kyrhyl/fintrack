import { ok, fail } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { buildNetWorthBreakdown } from "@/lib/services/net-worth";
import { Asset } from "@/models/Investment";
import { Liability } from "@/models/Liability";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";

function toCaptureDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST() {
  try {
    await connectToDatabase();

    const now = new Date();
    const captureDate = toCaptureDateKey(now);
    const month = captureDate.slice(0, 7);

    const [activeAssets, activeLiabilities] = await Promise.all([
      Asset.find({ isActive: true }).lean(),
      Liability.find({ isActive: true }).lean(),
    ]);

    const breakdown = buildNetWorthBreakdown(activeAssets, activeLiabilities);

    async function upsertSnapshot() {
      return NetWorthSnapshot.findOneAndUpdate(
        { captureDate },
        {
          month,
          captureDate,
          netWorth: breakdown.totals.netWorth,
          assetsTotal: breakdown.totals.assets,
          liabilitiesTotal: breakdown.totals.liabilities,
          capturedAt: now,
          sourceUpdatedAt: now,
        },
        {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        },
      );
    }

    let snapshot;
    try {
      snapshot = await upsertSnapshot();
    } catch (error) {
      const isDuplicateMonth =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000 &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string" &&
        (error as { message: string }).message.includes("month_1");

      if (!isDuplicateMonth) {
        throw error;
      }

      await NetWorthSnapshot.collection.dropIndex("month_1");
      snapshot = await upsertSnapshot();
    }

    return ok({
      captureDate: snapshot.captureDate,
      month: snapshot.month,
      netWorth: snapshot.netWorth,
      assetsTotal: snapshot.assetsTotal,
      liabilitiesTotal: snapshot.liabilitiesTotal,
      capturedAt: snapshot.capturedAt,
    });
  } catch (error) {
    console.error("Net worth capture failed:", error);
    const message = error instanceof Error ? error.message : "Unable to capture net worth right now.";
    return fail("CAPTURE_FAILED", message, 500);
  }
}
