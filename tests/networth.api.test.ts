import { POST as captureNetWorth } from "@/app/api/net-worth/capture/route";
import { GET as getNetWorthTrend } from "@/app/api/net-worth/route";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { Asset } from "@/models/Investment";
import { Liability } from "@/models/Liability";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";

describe("net worth tracker api", () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it("captures current net worth on demand", async () => {
    await Asset.create({
      name: "Cash Reserve",
      type: "cash",
      currentValue: 50000,
      isLiquid: true,
      isActive: true,
    });

    await Liability.create({
      name: "Test Loan",
      category: "loan",
      principal: 10000,
      outstandingBalance: 4000,
      monthlyPayment: 500,
      status: "on track",
      isActive: true,
    });

    const captureResponse = await captureNetWorth();
    const captureBody = await captureResponse.json();

    expect(captureResponse.status).toBe(200);
    expect(captureBody.success).toBe(true);
    expect(captureBody.data.month).toBe(toMonthKey(new Date()));
    expect(captureBody.data.netWorth).toBe(46000);

    const response = await getNetWorthTrend(new Request("http://localhost/api/net-worth?limit=12"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.latest.month).toBe(toMonthKey(new Date()));
    expect(body.data.latest.value).toBe(46000);

    const snapshots = await NetWorthSnapshot.find().lean();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].month).toBe(toMonthKey(new Date()));
  });

  it("overwrites daily capture when source balances change", async () => {
    const investment = await Asset.create({
      name: "Growth Fund",
      type: "fund",
      currentValue: 120000,
      annualYieldPercent: 4,
      isActive: true,
    });

    await Liability.create({
      name: "Car Loan",
      category: "loan",
      principal: 80000,
      outstandingBalance: 30000,
      monthlyPayment: 3000,
      status: "on track",
      isActive: true,
    });

    const firstCapture = await captureNetWorth();
    const firstBody = await firstCapture.json();
    const firstValue = firstBody.data.netWorth;

    await Asset.findByIdAndUpdate(investment._id, { currentValue: 150000 }, { runValidators: true });

    const secondCapture = await captureNetWorth();
    const secondBody = await secondCapture.json();
    const secondValue = secondBody.data.netWorth;

    expect(secondValue).toBeGreaterThan(firstValue);

    const snapshots = await NetWorthSnapshot.find({ month: toMonthKey(new Date()) }).lean();
    expect(snapshots).toHaveLength(1);
  });
});
