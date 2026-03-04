import { getApiBaseUrl, getUiDataSource } from "@/lib/data/config";
import { createApiDataProvider } from "@/lib/data/providers/api";
import { mockDataProvider } from "@/lib/data/providers/mock";

const provider = getUiDataSource() === "api" ? createApiDataProvider(getApiBaseUrl()) : mockDataProvider;
const debtsProvider = createApiDataProvider(getApiBaseUrl());

export const getDashboardData = provider.getDashboardData;
export const getAssetsData = provider.getAssetsData;
export const getInvestmentsData = provider.getAssetsData;
export const getDebtsData = debtsProvider.getDebtsData;
export const getNetWorthTrendData = provider.getNetWorthTrendData;
