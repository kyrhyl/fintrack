import { createApiDataProvider } from "@/lib/data/providers/api";

describe("api data provider", () => {
  it("maps dashboard overview and transactions in api mode", async () => {
    const now = new Date().toISOString();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/transactions")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  title: "Consulting",
                  category: "salary",
                  amount: 50000,
                  kind: "income",
                  transactionDate: now,
                },
                {
                  title: "Internet",
                  category: "utilities",
                  amount: 2000,
                  kind: "expense",
                  transactionDate: now,
                },
              ],
              total: 2,
            },
          }),
          { status: 200 },
        );
      }

      if (url.includes("/api/dashboard/overview")) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              month: now.slice(0, 7),
              kpis: {
                monthIncome: 50000,
                monthExpenses: 2000,
                monthCashFlow: 48000,
                netCashPosition: 48000,
                budgetUtilizationPercent: 0,
                allocationBalance: 0,
              },
              topExpenseCategories: [{ category: "utilities", total: 2000 }],
              statement: {
                asOf: now.slice(0, 7),
                incomeStatement: {
                  activeIncome: [{ label: "Consulting", value: 50000 }],
                  passiveIncome: [],
                  expenses: [{ label: "utilities", percentage: 100, value: 2000 }],
                  totals: {
                    activeIncome: 50000,
                    passiveIncome: 0,
                    income: 50000,
                    expenses: 2000,
                  },
                },
                balanceSheet: {
                  assets: [{ label: "Cash in hand", value: 10000, income: 0 }],
                  liabilities: [],
                  totals: {
                    assets: 10000,
                    assetsIncome: 0,
                    liabilities: 0,
                    liabilitiesPayment: 0,
                    netWorth: 10000,
                  },
                },
              },
            },
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ success: false }), { status: 500 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = createApiDataProvider("http://localhost:3000");
    const result = await provider.getDashboardData();

    expect(result.transactions[0]?.name).toBe("Internet");
    expect(result.financialSummary?.totalIncome).toBe(50000);
    expect(result.financialSummary?.totalExpenses).toBe(2000);

    vi.unstubAllGlobals();
  });
});
