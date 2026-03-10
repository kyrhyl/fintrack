import { ok } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { roundMoney } from "@/lib/services/budget";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";

function parseLimit(value: string | null) {
  const parsed = Number(value || "12");
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 12;
  }

  return Math.min(Math.floor(parsed), 36);
}

function monthLabelFromDate(date: Date | null, month: string) {
  const source = date || new Date(`${month}-01T00:00:00`);
  const labelMonth = source.toLocaleDateString("en-US", { month: "short" });
  const labelYear = source.toLocaleDateString("en-US", { year: "2-digit" });
  return `${labelMonth} '${labelYear}`;
}

export async function GET(request: Request) {
  await connectToDatabase();

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const snapshots = await NetWorthSnapshot.find()
    .sort({ capturedAt: -1 })
    .limit(limit)
    .lean();

  const ordered = [...snapshots].sort((a, b) => {
    const aTime = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
    const bTime = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
    return aTime - bTime;
  });
  const latest = ordered[ordered.length - 1] || null;
  const previous = ordered[ordered.length - 2] || null;
  const delta =
    latest && previous
      ? roundMoney((latest.netWorth || 0) - (previous.netWorth || 0))
      : 0;
  const deltaPercent =
    latest && previous && previous.netWorth !== 0
      ? roundMoney((delta / previous.netWorth) * 100)
      : 0;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return ok({
    points: ordered.map((item) => ({
      label: monthLabelFromDate(item.capturedAt ? new Date(item.capturedAt) : null, item.month),
      month: item.month,
      value: roundMoney(item.netWorth || 0),
    })),
    latest: latest
      ? {
          month: latest.month,
          value: roundMoney(latest.netWorth || 0),
          assetsTotal: roundMoney(latest.assetsTotal || 0),
          liabilitiesTotal: roundMoney(latest.liabilitiesTotal || 0),
          capturedAt: latest.capturedAt,
        }
      : null,
    previous: previous
      ? {
          month: previous.month,
          value: roundMoney(previous.netWorth || 0),
          capturedAt: previous.capturedAt,
        }
      : null,
    delta,
    deltaPercent,
    isCurrentMonthCaptured: ordered.some((item) => item.captureDate?.startsWith(currentMonthKey)),
  });
}
