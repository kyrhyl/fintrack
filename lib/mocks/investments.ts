import type { AssetsData } from "@/types/finance";

export const investmentsMock: AssetsData = {
  title: "Asset Portfolio",
  subtitle: "Detailed breakdown as of February 20, 2026",
  summaryCards: [
    { label: "Net Worth", value: 2323690.09, note: "Across all tracked assets" },
    { label: "Monthly Dividends", value: 8553.39, note: "Passive income this month" },
  ],
  bankAccounts: [
    { name: "Land Bank", amount: 33805 },
    { name: "CIMB Bank", amount: 3141.54 },
    { name: "OwnBank (Flexible)", amount: 294 },
    { name: "GSIS Savings", amount: 55000 },
  ],
  trend: [
    { label: "Jan", value: 1290000 },
    { label: "Mar", value: 1410000 },
    { label: "May", value: 1470000 },
    { label: "Jul", value: 1630000 },
    { label: "Sep", value: 1700000 },
    { label: "Nov", value: 1760000 },
    { label: "Jan", value: 1880000 },
    { label: "Feb", value: 1910000 },
  ],
  holdings: [
    { name: "UITF Funds", value: 70000, apy: 3, monthlyIncome: 175 },
    { name: "Stock Portfolio", value: 1563911.15, apy: 6, monthlyIncome: 7819.56 },
    { name: "Pag-ibig MP2", value: 256989.26, apy: 3, monthlyIncome: 621.06 },
  ],
};
