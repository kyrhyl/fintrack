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
};
