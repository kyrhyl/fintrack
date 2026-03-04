import {
  applyAllocationStrategy,
  computeCarryOverByCategory,
  computeBudgetActuals,
} from "@/lib/services/budget";

describe("budget service", () => {
  it("computes category actuals and over-budget flags", () => {
    const categories = [
      { name: "debt", plannedAmount: 2000 },
      { name: "utilities", plannedAmount: 1000 },
    ];

    const actualByCategory = {
      debt: 2500,
      utilities: 900,
    };

    const result = computeBudgetActuals(categories, actualByCategory);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      category: "debt",
      variance: 500,
      overBudget: true,
    });
    expect(result[1]).toMatchObject({
      category: "utilities",
      variance: -100,
      overBudget: false,
    });
  });

  it("computes carry-over only for unspent positive balances", () => {
    const categories = [
      { name: "debt", plannedAmount: 3000 },
      { name: "personal", plannedAmount: 2000 },
    ];

    const actualByCategory = {
      debt: 1800,
      personal: 2500,
    };

    const carryOver = computeCarryOverByCategory(categories, actualByCategory);

    expect(carryOver).toEqual({ debt: 1200 });
  });

  it("rejects percentage strategy when total percentage exceeds 100", () => {
    const result = applyAllocationStrategy(
      [
        { name: "needs", plannedAmount: 0, percentage: 70 },
        { name: "wants", plannedAmount: 0, percentage: 35 },
      ],
      "percentage",
      50000,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toMatch(/cannot exceed 100/i);
    }
  });

  it("calculates planned amount using percentage strategy", () => {
    const result = applyAllocationStrategy(
      [
        { name: "needs", plannedAmount: 0, percentage: 50 },
        { name: "savings", plannedAmount: 0, percentage: 20 },
      ],
      "percentage",
      40000,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.categories).toEqual([
        { name: "needs", plannedAmount: 20000, percentage: 50 },
        { name: "savings", plannedAmount: 8000, percentage: 20 },
      ]);
    }
  });
});
