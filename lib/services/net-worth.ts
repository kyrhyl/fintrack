import { roundMoney } from "@/lib/services/budget";

type InvestmentLike = {
  type: string;
  currentValue?: number;
  annualYieldPercent?: number;
  monthlyIncome?: number;
  institution?: string;
  name?: string;
  isLiquid?: boolean;
};

type LiabilityLike = {
  name: string;
  outstandingBalance?: number;
  monthlyPayment?: number;
};

type BalanceSheetAsset = {
  label: string;
  value: number;
  income: number;
};

type BalanceSheetLiability = {
  label: string;
  debt: number;
  payment: number;
};

export type NetWorthBreakdown = {
  assets: BalanceSheetAsset[];
  liabilities: BalanceSheetLiability[];
  totals: {
    assets: number;
    assetsIncome: number;
    liabilities: number;
    liabilitiesPayment: number;
    netWorth: number;
  };
};

function incomeFrom(
  investments: InvestmentLike[],
  predicate: (value: InvestmentLike) => boolean,
) {
  return roundMoney(
    investments
      .filter(predicate)
      .reduce(
        (sum, item) => {
          const apy = item.annualYieldPercent || 0;
          const monthlyIncome = item.monthlyIncome;
          const resolved =
            typeof monthlyIncome === "number" && monthlyIncome > 0
              ? monthlyIncome
              : apy > 0
              ? ((item.currentValue || 0) * apy) / 100 / 12
              : Math.max(monthlyIncome || 0, 0);

          return sum + resolved;
        },
        0,
      ),
  );
}

export function buildNetWorthBreakdown(
  activeInvestments: InvestmentLike[],
  activeLiabilities: LiabilityLike[],
): NetWorthBreakdown {
  const cashInHand = activeInvestments
    .filter(
      (item) =>
        item.type === "cash" &&
        (((item.institution || "").toLowerCase().includes("cash in hand") ||
          (item.name || "").toLowerCase().includes("cash in hand"))),
    )
    .reduce((sum, item) => sum + (item.currentValue || 0), 0);

  const bankAccounts = activeInvestments
    .filter(
      (item) =>
        item.isLiquid ||
        (item.type === "cash" &&
          !(item.institution || "").toLowerCase().includes("cash in hand") &&
          !(item.name || "").toLowerCase().includes("cash in hand")),
    )
    .reduce((sum, item) => sum + (item.currentValue || 0), 0);

  const cooperativeAssets = activeInvestments
    .filter((item) => item.type === "cooperative")
    .reduce((sum, item) => sum + (item.currentValue || 0), 0);

  const personalAssets = activeInvestments
    .filter((item) => item.type === "other")
    .reduce((sum, item) => sum + (item.currentValue || 0), 0);

  const marketAssets = activeInvestments
    .filter((item) => ["stock", "fund", "bond", "mp2"].includes(item.type))
    .reduce((sum, item) => sum + (item.currentValue || 0), 0);

  const assets: BalanceSheetAsset[] = [
    {
      label: "Cash in hand",
      value: roundMoney(cashInHand),
      income: 0,
    },
    {
      label: "Banks Accounts",
      value: roundMoney(bankAccounts),
      income: incomeFrom(
        activeInvestments,
        (item) =>
          item.isLiquid ||
          (item.type === "cash" &&
            !(item.institution || "").toLowerCase().includes("cash in hand") &&
            !(item.name || "").toLowerCase().includes("cash in hand")),
      ),
    },
    {
      label: "Cooperative",
      value: roundMoney(cooperativeAssets),
      income: incomeFrom(activeInvestments, (item) => item.type === "cooperative"),
    },
    {
      label: "Personal Assets",
      value: roundMoney(personalAssets),
      income: incomeFrom(activeInvestments, (item) => item.type === "other"),
    },
    {
      label: "Stocks/Funds/Insurance",
      value: roundMoney(marketAssets),
      income: incomeFrom(activeInvestments, (item) =>
        ["stock", "fund", "bond", "mp2"].includes(item.type),
      ),
    },
  ];

  const liabilities: BalanceSheetLiability[] = activeLiabilities.map((item) => ({
    label: item.name,
    debt: roundMoney(item.outstandingBalance || 0),
    payment: roundMoney(item.monthlyPayment || 0),
  }));

  const totalAssets = roundMoney(assets.reduce((sum, item) => sum + item.value, 0));
  const totalAssetIncome = roundMoney(
    assets.reduce((sum, item) => sum + item.income, 0),
  );
  const totalLiabilities = roundMoney(
    liabilities.reduce((sum, item) => sum + item.debt, 0),
  );
  const totalLiabilityPayment = roundMoney(
    liabilities.reduce((sum, item) => sum + item.payment, 0),
  );
  const netWorth = roundMoney(totalAssets - totalLiabilities);

  return {
    assets,
    liabilities,
    totals: {
      assets: totalAssets,
      assetsIncome: totalAssetIncome,
      liabilities: totalLiabilities,
      liabilitiesPayment: totalLiabilityPayment,
      netWorth,
    },
  };
}
