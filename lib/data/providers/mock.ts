import { dashboardMock } from "@/lib/mocks/dashboard";
import { debtsMock } from "@/lib/mocks/debts";
import { investmentsMock } from "@/lib/mocks/investments";
import { netWorthTrendMock } from "@/lib/mocks/net-worth";

import type { FinanceDataProvider } from "@/lib/data/types";

export const mockDataProvider: FinanceDataProvider = {
  async getDashboardData() {
    return dashboardMock;
  },

  async getAssetsData() {
    return investmentsMock;
  },

  async getDebtsData() {
    return debtsMock;
  },

  async getNetWorthTrendData() {
    return netWorthTrendMock;
  },

  async getDailyTrackingData() {
    const today = new Date().toISOString().split("T")[0];
    return {
      date: today,
      netSalary: 0,
      salaryMonth: null,
      budgetedTotal: 0,
      disposableMonthly: 0,
      dailyAllowance: 0,
      daysRemaining: 0,
      recurringDebtsTotal: 0,
      recurringDebts: [],
      weeklySpending: [],
      transactions: [],
      todaySpending: 0,
      monthSpending: 0,
      budgetProgress: [],
      categories: ["Housing", "Food", "Transportation", "Utilities", "Entertainment", "Savings", "Other"],
      upcomingBills: [],
    };
  },
};
