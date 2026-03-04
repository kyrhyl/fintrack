import { GET as getAssetsOverview } from "@/app/api/assets/overview/route";
import { connectToDatabase } from "@/lib/mongodb";
import { Asset } from "@/models/Investment";

describe("assets overview api", () => {
  beforeEach(async () => {
    await connectToDatabase();
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
});
