import type { NetWorthTrendData } from "@/types/finance";

export const netWorthTrendMock: NetWorthTrendData = {
  points: [
    { label: "09/25", month: "2025-09", value: 2145000 },
    { label: "10/25", month: "2025-10", value: 2192500 },
    { label: "11/25", month: "2025-11", value: 2231200 },
    { label: "12/25", month: "2025-12", value: 2287000 },
    { label: "01/26", month: "2026-01", value: 2364100 },
    { label: "02/26", month: "2026-02", value: 2441143.67 },
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
    capturedAt: new Date("2026-01-31T12:00:00.000Z").toISOString(),
  },
  delta: 77043.67,
  deltaPercent: 3.26,
  isCurrentMonthCaptured: true,
};
