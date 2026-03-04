import { ok } from "@/lib/api";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { roundMoney } from "@/lib/services/budget";
import { buildNetWorthBreakdown } from "@/lib/services/net-worth";
import { Asset } from "@/models/Investment";
import { Liability } from "@/models/Liability";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";

const SNAPSHOT_COOLDOWN_MS = 15 * 60 * 1000;

function parseLimit(value: string | null) {
  const parsed = Number(value || "12");
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 12;
  }

  return Math.min(Math.floor(parsed), 36);
}

function monthLabel(month: string) {
  const [year, monthNum] = month.split("-");
  return `${monthNum}/${year.slice(2)}`;
}

async function latestSourceUpdateAt() {
  const [investmentLatest, liabilityLatest] = await Promise.all([
    Asset.findOne({ isActive: true }).sort({ updatedAt: -1 }).select({ updatedAt: 1 }).lean(),
    Liability.findOne({ isActive: true }).sort({ updatedAt: -1 }).select({ updatedAt: 1 }).lean(),
  ]);

  const candidates = [investmentLatest?.updatedAt, liabilityLatest?.updatedAt]
    .filter(Boolean)
    .map((value) => new Date(value as Date));

  return candidates.length > 0
    ? new Date(Math.max(...candidates.map((value) => value.getTime())))
    : new Date(0);
}

async function upsertCurrentMonthSnapshot(now: Date) {
  const currentMonth = toMonthKey(now);
  const sourceUpdatedAt = await latestSourceUpdateAt();

  const existing = await NetWorthSnapshot.findOne({ month: currentMonth }).lean();
  const capturedAt = existing?.capturedAt ? new Date(existing.capturedAt) : null;
  const recentCapture =
    capturedAt && now.getTime() - capturedAt.getTime() < SNAPSHOT_COOLDOWN_MS;
  const sourceChanged =
    !existing?.sourceUpdatedAt ||
    sourceUpdatedAt.getTime() > new Date(existing.sourceUpdatedAt).getTime();

  if (existing && recentCapture && !sourceChanged) {
    return;
  }

  const [activeAssets, activeLiabilities] = await Promise.all([
    Asset.find({ isActive: true }).lean(),
    Liability.find({ isActive: true }).lean(),
  ]);

  const breakdown = buildNetWorthBreakdown(activeAssets, activeLiabilities);

  await NetWorthSnapshot.findOneAndUpdate(
    { month: currentMonth },
    {
      month: currentMonth,
      netWorth: breakdown.totals.netWorth,
      assetsTotal: breakdown.totals.assets,
      liabilitiesTotal: breakdown.totals.liabilities,
      sourceUpdatedAt,
      capturedAt: now,
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    },
  );
}

export async function GET(request: Request) {
  await connectToDatabase();

  const now = new Date();
  await upsertCurrentMonthSnapshot(now);

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const snapshots = await NetWorthSnapshot.find()
    .sort({ month: -1 })
    .limit(limit)
    .lean();

  const ordered = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
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

  return ok({
    points: ordered.map((item) => ({
      label: monthLabel(item.month),
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
    isCurrentMonthCaptured: latest?.month === toMonthKey(now),
  });
}
