export type BudgetCategoryAmount = {
  name: string;
  plannedAmount: number;
};

export type BudgetActual = {
  category: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  utilizationPercent: number;
  overBudget: boolean;
};

export type BudgetInsight = {
  overspentCategories: BudgetActual[];
  recommendedAdjustments: Array<{
    category: string;
    suggestedNextMonthAmount: number;
    reason: string;
  }>;
};

type AllocationResult<T extends { name: string; plannedAmount: number; percentage?: number }> =
  | {
      success: true;
      categories: T[];
    }
  | {
      success: false;
      message: string;
    };

export function computeBudgetActuals(
  categories: BudgetCategoryAmount[],
  actualByCategory: Record<string, number>,
) {
  return categories.map((category) => {
    const actualAmount = roundMoney(actualByCategory[category.name] || 0);
    const plannedAmount = roundMoney(category.plannedAmount || 0);
    const variance = roundMoney(actualAmount - plannedAmount);
    const utilizationPercent =
      plannedAmount > 0 ? roundMoney((actualAmount / plannedAmount) * 100) : 0;

    return {
      category: category.name,
      plannedAmount,
      actualAmount,
      variance,
      utilizationPercent,
      overBudget: variance > 0,
    } satisfies BudgetActual;
  });
}

export function applyAllocationStrategy<T extends { name: string; plannedAmount: number; percentage?: number }>(
  categories: T[],
  strategy: "fixed" | "variable" | "percentage",
  plannedIncome: number,
): AllocationResult<T> {
  if (strategy !== "percentage") {
    return {
      success: true,
      categories: categories.map((category) => ({
        ...category,
        plannedAmount: roundMoney(category.plannedAmount || 0),
      })),
    };
  }

  const totalPercentage = roundMoney(categories.reduce((sum, category) => sum + (category.percentage || 0), 0));

  if (totalPercentage <= 0) {
    return {
      success: false,
      message: "Percentage strategy requires at least one category percentage greater than zero.",
    };
  }

  if (totalPercentage > 100) {
    return {
      success: false,
      message: "Total category percentage cannot exceed 100.",
    };
  }

  return {
    success: true,
    categories: categories.map((category) => ({
      ...category,
      plannedAmount: roundMoney((plannedIncome * (category.percentage || 0)) / 100),
    })),
  };
}

export function computeCarryOverByCategory(
  categories: BudgetCategoryAmount[],
  actualByCategory: Record<string, number>,
) {
  return categories.reduce<Record<string, number>>((acc, category) => {
    const plannedAmount = roundMoney(category.plannedAmount || 0);
    const actualAmount = roundMoney(actualByCategory[category.name] || 0);
    const remainingAmount = roundMoney(plannedAmount - actualAmount);

    if (remainingAmount > 0) {
      acc[category.name] = remainingAmount;
    }

    return acc;
  }, {});
}

export function computeBudgetInsights(actuals: BudgetActual[]): BudgetInsight {
  const overspentCategories = actuals
    .filter((item) => item.overBudget)
    .sort((a, b) => b.variance - a.variance);

  const recommendedAdjustments = overspentCategories.slice(0, 3).map((item) => ({
    category: item.category,
    suggestedNextMonthAmount: roundMoney(item.actualAmount * 1.05),
    reason:
      "Recent spending exceeded the plan; consider increasing this category cap by 5%.",
  }));

  return {
    overspentCategories,
    recommendedAdjustments,
  };
}

export function calculateAllocationBalance(plannedIncome: number, plannedTotal: number) {
  return roundMoney(plannedIncome - plannedTotal);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
