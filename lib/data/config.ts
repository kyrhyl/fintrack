export type UiDataSource = "mock" | "api";

export function getUiDataSource(): UiDataSource {
  return process.env.FINANCE_UI_DATA_SOURCE === "api" ? "api" : "mock";
}

export function getApiBaseUrl(): string {
  const url = process.env.FINANCE_API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
