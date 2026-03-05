import { createApiDataProvider } from "@/lib/data/providers/api";
import { connectToDatabase } from "@/lib/mongodb";
import { Transaction } from "@/models/Transaction";
import { Asset } from "@/models/Investment";
import { Liability } from "@/models/Liability";

describe("api data provider", () => {
  beforeEach(async () => {
    await connectToDatabase();
    await Transaction.deleteMany({});
    await Asset.deleteMany({});
    await Liability.deleteMany({});
  });

  it("maps dashboard from database query", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    await Transaction.insertMany([
      {
        title: "Salary",
        category: "Salary",
        amount: 50000,
        kind: "income",
        transactionDate: new Date(`${year}-${month}-01`),
      },
      {
        title: "Internet",
        category: "Utilities",
        amount: 2000,
        kind: "expense",
        transactionDate: new Date(`${year}-${month}-05`),
      },
    ]);

    await Asset.insertMany([
      {
        name: "Savings Account",
        type: "bank_account",
        currentValue: 50000,
        isLiquid: true,
        isActive: true,
      },
      {
        name: "Stock Portfolio",
        type: "stock",
        currentValue: 100000,
        isActive: true,
      },
    ]);

    await Liability.insertMany([
      {
        name: "Credit Card",
        principal: 5000,
        outstandingBalance: 5000,
        monthlyPayment: 500,
        isActive: true,
      },
    ]);

    const provider = createApiDataProvider("http://localhost:3000");
    const result = await provider.getDashboardData();

    expect(result.financialSummary?.totalIncome).toBe(50000);
    expect(result.financialSummary?.totalExpenses).toBe(2000);
    expect(result.balanceSheet?.totals?.assets).toBe(150000);
    expect(result.balanceSheet?.totals?.liabilities).toBe(5000);
    expect(result.balanceSheet?.totals?.netWorth).toBe(145000);
  });

  it("returns empty data when no transactions", async () => {
    const provider = createApiDataProvider("http://localhost:3000");
    const result = await provider.getDashboardData();

    expect(result.financialSummary?.totalIncome).toBe(0);
    expect(result.balanceSheet?.totals?.netWorth).toBe(0);
  });
});
