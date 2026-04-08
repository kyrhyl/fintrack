import { GET as getStocksOverview } from "@/app/api/stocks/overview/route";
import { POST as captureMonthlyStocks } from "@/app/api/stocks/capture-monthly/route";
import { connectToDatabase } from "@/lib/mongodb";
import { STOCK_PORTFOLIO_ASSET_NAME, STOCK_PORTFOLIO_ASSET_NOTE_TAG } from "@/lib/stocks/constants";
import { Asset } from "@/models/Investment";
import { StockHolding } from "@/models/StockHolding";
import { StockSnapshot } from "@/models/StockSnapshot";

describe("stocks api", () => {
  beforeEach(async () => {
    await connectToDatabase();
    await Asset.deleteMany({});
    await StockHolding.deleteMany({});
    await StockSnapshot.deleteMany({});
  });

  it("returns stock positions from active stock holdings", async () => {
    await StockHolding.create([
      {
        name: "Jollibee Foods Corporation",
        symbol: "JFC",
        exchange: "PSE",
        shares: 100,
        averageCost: 230,
        lastPrice: 250,
        isActive: true,
      },
      {
        name: "SM Prime Holdings",
        symbol: "SMPH",
        exchange: "PSE",
        shares: 200,
        averageCost: 30,
        lastPrice: 32,
        isActive: true,
      },
    ]);

    const response = await getStocksOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.positions).toHaveLength(2);
    expect(body.data.positions[0].symbol).toBe("JFC");
    expect(body.data.summaryCards[0].value).toBe(31400);
  });

  it("captures monthly snapshots and syncs aggregate stock asset", async () => {
    await StockHolding.create({
      name: "SM Investments",
      symbol: "SM",
      exchange: "PSE",
      shares: 10,
      averageCost: 800,
      lastPrice: 900,
      isActive: true,
    });

    const response = await captureMonthlyStocks(
      new Request("http://localhost/api/stocks/capture-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-04" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.capturedCount).toBe(1);

    const snapshot = await StockSnapshot.findOne({ month: "2026-04", symbol: "SM" }).lean();
    expect(snapshot).toBeTruthy();
    expect(snapshot?.closePrice).toBe(900);
    expect(snapshot?.marketValue).toBe(9000);

    const asset = await Asset.findOne({ name: STOCK_PORTFOLIO_ASSET_NAME }).lean();
    expect(asset?.currentValue).toBe(9000);
    expect(asset?.type).toBe("stock");
    expect(asset?.notes).toContain(STOCK_PORTFOLIO_ASSET_NOTE_TAG);

    const holding = await StockHolding.findOne({ symbol: "SM" }).lean();
    expect(holding?.lastPrice).toBe(900);
  });

  it("keeps negative unrealized pnl when last price is below average cost", async () => {
    await StockHolding.create({
      name: "VREIT",
      symbol: "VREIT",
      exchange: "PSE",
      shares: 100,
      averageCost: 1.69,
      lastPrice: 1.4,
      isActive: true,
    });

    const response = await captureMonthlyStocks(
      new Request("http://localhost/api/stocks/capture-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-04" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const snapshot = await StockSnapshot.findOne({ month: "2026-04", symbol: "VREIT" }).lean();
    expect(snapshot?.closePrice).toBe(1.4);
    expect(snapshot?.unrealizedPnL).toBe(-29);
  });

  it("removes stale symbols for the same captured month", async () => {
    await StockHolding.create({
      name: "SM Investments",
      symbol: "SM",
      exchange: "PSE",
      shares: 10,
      averageCost: 100,
      lastPrice: 120,
      isActive: true,
    });

    await StockSnapshot.create({
      month: "2026-04",
      symbol: "OLD",
      name: "Old Symbol",
      exchange: "PSE",
      closePrice: 500,
      shares: 1,
      marketValue: 500,
      costBasis: 100,
      unrealizedPnL: 400,
      capturedAt: new Date("2026-04-01T00:00:00.000Z"),
      source: "manual",
    });

    const response = await captureMonthlyStocks(
      new Request("http://localhost/api/stocks/capture-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: "2026-04" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const oldSnapshot = await StockSnapshot.findOne({ month: "2026-04", symbol: "OLD" }).lean();
    expect(oldSnapshot).toBeNull();

    const smSnapshot = await StockSnapshot.findOne({ month: "2026-04", symbol: "SM" }).lean();
    expect(smSnapshot?.marketValue).toBe(1200);
  });

});
