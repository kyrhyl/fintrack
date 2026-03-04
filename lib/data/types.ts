import type {
  AssetsData,
  DashboardData,
  DebtsData,
  NetWorthTrendData,
} from "@/types/finance";

export type FinanceDataProvider = {
  getDashboardData: () => Promise<DashboardData>;
  getAssetsData: () => Promise<AssetsData>;
  getDebtsData: () => Promise<DebtsData>;
  getNetWorthTrendData: () => Promise<NetWorthTrendData>;
};
