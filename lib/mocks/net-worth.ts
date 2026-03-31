import type { NetWorthTrendData } from "@/types/finance";

export const netWorthTrendMock: NetWorthTrendData = {
  points: [
    { label: "Sep '25", month: "2025-09", value: 2145000, assetsTotal: 2353200, liabilitiesTotal: 208200 },
    { label: "Oct '25", month: "2025-10", value: 2192500, assetsTotal: 2405400, liabilitiesTotal: 212900 },
    { label: "Nov '25", month: "2025-11", value: 2231200, assetsTotal: 2453100, liabilitiesTotal: 221900 },
    { label: "Dec '25", month: "2025-12", value: 2287000, assetsTotal: 2509800, liabilitiesTotal: 222800 },
    { label: "Jan '26", month: "2026-01", value: 2364100, assetsTotal: 2558400, liabilitiesTotal: 194300 },
    { label: "Feb '26", month: "2026-02", value: 2441143.67, assetsTotal: 2638942.29, liabilitiesTotal: 197798.62 },
  ],
  latest: {
    month: "2026-02",
    value: 2441143.67,
    assetsTotal: 2638942.29,
    liabilitiesTotal: 197798.62,
    capturedAt: new Date("2026-02-20T12:00:00.000Z").toISOString(),
  },
  previous: {
    month: "2026-01",
    value: 2364100,
    assetsTotal: 2558400,
    liabilitiesTotal: 194300,
    capturedAt: new Date("2026-01-31T12:00:00.000Z").toISOString(),
  },
  delta: 77043.67,
  deltaPercent: 3.26,
  isCurrentMonthCaptured: true,
};
