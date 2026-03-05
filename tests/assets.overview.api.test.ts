import { GET as getAssetsOverview } from "@/app/api/assets/overview/route";
import { connectToDatabase } from "@/lib/mongodb";
import { Asset } from "@/models/Investment";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";

describe("assets overview api", () => {
  beforeEach(async () => {
    await connectToDatabase();
    await NetWorthSnapshot.deleteMany({});
    await Asset.deleteMany({});
  });

  it("falls back to APY estimate when monthly income is zero", async () => {
    await Asset.create({
      name: "Zero Yield Override",
      type: "stock",
      currentValue: 100000,
      annualYieldPercent: 12,
      monthlyIncome: 0,
      isActive: true,
    });

    const response = await getAssetsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const zeroYield = body.data.holdings.find((item: { name: string }) => item.name === "Zero Yield Override");
    expect(zeroYield).toBeTruthy();
    expect(zeroYield.monthlyIncome).toBe(1000);
  });

  it("uses snapshot-based trend when snapshots exist", async () => {
    await NetWorthSnapshot.create([
      { month: "2026-01", netWorth: 1800000, assetsTotal: 2000000, liabilitiesTotal: 200000, capturedAt: new Date("2026-01-15"), sourceUpdatedAt: new Date() },
      { month: "2026-02", netWorth: 1950000, assetsTotal: 2150000, liabilitiesTotal: 200000, capturedAt: new Date("2026-02-15"), sourceUpdatedAt: new Date() },
      { month: "2026-03", netWorth: 2100000, assetsTotal: 2300000, liabilitiesTotal: 200000, capturedAt: new Date("2026-03-15"), sourceUpdatedAt: new Date() },
    ]);

    const response = await getAssetsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.trend).toHaveLength(3);
    expect(body.data.trend[0].label).toBe("01/26");
    expect(body.data.trend[0].value).toBe(2000000);
    expect(body.data.trend[2].value).toBe(2300000);
  });

  it("falls back to current assets when no snapshots exist", async () => {
    await Asset.create([
      { name: "Stock A", type: "stock", currentValue: 100000, annualYieldPercent: 6, isActive: true },
      { name: "Fund B", type: "fund", currentValue: 50000, annualYieldPercent: 4, isActive: true },
    ]);

    const response = await getAssetsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.trend).toHaveLength(1);
    expect(body.data.trend[0].value).toBe(150000);
  });

  it("includes assetsTotal in summaryCards from snapshot when available", async () => {
    await NetWorthSnapshot.create({
      month: "2026-03",
      netWorth: 2100000,
      assetsTotal: 2500000,
      liabilitiesTotal: 400000,
      capturedAt: new Date(),
      sourceUpdatedAt: new Date(),
    });

    const response = await getAssetsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.summaryCards[0].value).toBe(2500000);
  });
});
