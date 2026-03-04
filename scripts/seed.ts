import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "fintrack";

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

function getMongoUri() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  return MONGODB_URI;
}

function addMonthsUtc(date: Date, delta: number) {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + delta);
  return copy;
}

function monthStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function monthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function txDate(monthDate: Date, day: number) {
  return new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), day, 0, 0, 0, 0));
}

async function run() {
  await mongoose.connect(getMongoUri(), { dbName: MONGODB_DB });

  const transactionCollection = mongoose.connection.collection("transactions");
  const budgetCollection = mongoose.connection.collection("budgetplans");
  const recurringCollection = mongoose.connection.collection("recurringexpenses");
  const investmentCollection = mongoose.connection.collection("investments");
  const liabilityCollection = mongoose.connection.collection("liabilities");
  const netWorthCollection = mongoose.connection.collection("networthsnapshots");
  const salaryCollection = mongoose.connection.collection("salaryrecords");

  await Promise.all([
    transactionCollection.deleteMany({}),
    budgetCollection.deleteMany({}),
    recurringCollection.deleteMany({}),
    investmentCollection.deleteMany({}),
    liabilityCollection.deleteMany({}),
    netWorthCollection.deleteMany({}),
    salaryCollection.deleteMany({}),
  ]);

  const now = new Date();
  const currentMonth = monthStartUtc(now);
  const last8Months = Array.from({ length: 8 }, (_, index) => addMonthsUtc(currentMonth, index - 7));
  const nowStamp = new Date();

  const transactions = last8Months.flatMap((monthDate, idx) => {
    const incomeBase = 54000 + idx * 700;
    const debtExpense = 1650 + idx * 55;
    const personalExpense = 6200 + idx * 210;
    const utilitiesExpense = 1300 + idx * 45;

    return [
      {
        title: "Salary",
        kind: "income",
        category: "salary",
        amount: incomeBase,
        transactionDate: txDate(monthDate, 1),
        notes: "Monthly salary",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "Dividend Payout",
        kind: "income",
        category: "investment",
        amount: 1700 + idx * 80,
        transactionDate: txDate(monthDate, 5),
        notes: "Portfolio passive income",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "Retirement Contribution",
        kind: "income",
        category: "savings",
        amount: 3000 + idx * 50,
        transactionDate: txDate(monthDate, 6),
        notes: "Savings vehicle contribution",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "GSIS Conso Loan",
        kind: "expense",
        category: "debt",
        amount: debtExpense,
        transactionDate: txDate(monthDate, 14),
        notes: "Loan installment",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "Balance Conversion",
        kind: "expense",
        category: "debt",
        amount: 2450 + idx * 65,
        transactionDate: txDate(monthDate, 16),
        notes: "Card balance conversion",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "Pet Supplies & Food",
        kind: "expense",
        category: "personal",
        amount: personalExpense,
        transactionDate: txDate(monthDate, 20),
        notes: "Personal expense",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "Fiber Internet Bill",
        kind: "expense",
        category: "utilities",
        amount: utilitiesExpense,
        transactionDate: txDate(monthDate, 12),
        notes: "Utility payment",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
      {
        title: "Monthly Medical Fund",
        kind: "expense",
        category: "medical",
        amount: 2100 + idx * 70,
        transactionDate: txDate(monthDate, 10),
        notes: "Healthcare reserve",
        createdAt: nowStamp,
        updatedAt: nowStamp,
      },
    ];
  });

  await transactionCollection.insertMany(transactions);

  const currentMonthKey = monthKey(currentMonth);
  const previousMonthKey = monthKey(addMonthsUtc(currentMonth, -1));

  await budgetCollection.insertMany([
    {
      month: previousMonthKey,
      plannedIncome: 60000,
      allocationStrategy: "fixed",
      carryOverEnabled: false,
      status: "locked",
      categories: [
        { name: "debt", type: "fixed", plannedAmount: 23500, percentage: 0, recurrence: "monthly" },
        { name: "personal", type: "variable", plannedAmount: 9100, percentage: 0, recurrence: "monthly" },
        { name: "savings", type: "fixed", plannedAmount: 4300, percentage: 0, recurrence: "monthly" },
        { name: "utilities", type: "fixed", plannedAmount: 2800, percentage: 0, recurrence: "monthly" },
        { name: "medical", type: "fixed", plannedAmount: 3100, percentage: 0, recurrence: "monthly" },
        { name: "stocks", type: "fixed", plannedAmount: 12000, percentage: 0, recurrence: "monthly" },
      ],
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      month: currentMonthKey,
      plannedIncome: 61500,
      allocationStrategy: "fixed",
      carryOverEnabled: true,
      status: "draft",
      categories: [
        { name: "debt", type: "fixed", plannedAmount: 24159.96, percentage: 0, recurrence: "monthly" },
        { name: "personal", type: "variable", plannedAmount: 9800, percentage: 0, recurrence: "monthly" },
        { name: "savings", type: "fixed", plannedAmount: 4800, percentage: 0, recurrence: "monthly" },
        { name: "utilities", type: "fixed", plannedAmount: 3200, percentage: 0, recurrence: "monthly" },
        { name: "medical", type: "fixed", plannedAmount: 3400, percentage: 0, recurrence: "monthly" },
        { name: "stocks", type: "fixed", plannedAmount: 13000, percentage: 0, recurrence: "monthly" },
      ],
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
  ]);

  const nextMonth = addMonthsUtc(currentMonth, 1);

  await recurringCollection.insertMany([
    {
      name: "GSIS Conso Loan",
      amount: 1792,
      category: "debt",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 14),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Balance Conversion",
      amount: 2914.28,
      category: "debt",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 18),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Laptop Equipment",
      amount: 4582,
      category: "loan",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 20),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Internet",
      amount: 1500,
      category: "utilities",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 12),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Netflix",
      amount: 549,
      category: "subscriptions",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 9),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Scribd",
      amount: 129,
      category: "subscriptions",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 8),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "TRF",
      amount: 49,
      category: "subscriptions",
      recurrenceRule: "monthly",
      nextDueDate: txDate(nextMonth, 11),
      autoCreateTransaction: false,
      isActive: true,
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
  ]);

  await investmentCollection.insertMany([
    {
      name: "Stock Portfolio",
      type: "stock",
      currentValue: 1563911.15,
      annualYieldPercent: 6,
      monthlyIncome: 7819.56,
      institution: "DragonFI",
      isLiquid: false,
      isActive: true,
      acquiredAt: addMonthsUtc(currentMonth, -18),
      notes: "Core growth portfolio",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "UITF Funds",
      type: "fund",
      currentValue: 70000,
      annualYieldPercent: 3,
      monthlyIncome: 175,
      institution: "Land Bank",
      isLiquid: true,
      isActive: true,
      acquiredAt: addMonthsUtc(currentMonth, -14),
      notes: "Balanced fund",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Pag-ibig MP2",
      type: "mp2",
      currentValue: 256989.26,
      annualYieldPercent: 3,
      monthlyIncome: 621.06,
      institution: "Pag-IBIG",
      isLiquid: false,
      isActive: true,
      acquiredAt: addMonthsUtc(currentMonth, -24),
      notes: "Long-term savings",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Emergency Liquidity",
      type: "cash",
      currentValue: 92240.54,
      annualYieldPercent: 0,
      monthlyIncome: 0,
      institution: "CIMB Bank",
      isLiquid: true,
      isActive: true,
      acquiredAt: addMonthsUtc(currentMonth, -8),
      notes: "High liquidity reserve",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
  ]);

  await liabilityCollection.insertMany([
    {
      name: "GSIS Conso",
      category: "loan",
      principal: 130099.2,
      outstandingBalance: 130099.2,
      monthlyPayment: 1792,
      interestRatePercent: 7,
      startDate: addMonthsUtc(currentMonth, -1),
      termMonths: 72,
      status: "newly opened",
      isActive: true,
      notes: "Government salary loan",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "GSIS Policy Loan",
      category: "loan",
      principal: 22000,
      outstandingBalance: 12100,
      monthlyPayment: 2000,
      interestRatePercent: 6,
      startDate: addMonthsUtc(currentMonth, -9),
      termMonths: 20,
      status: "on track",
      isActive: true,
      notes: "Policy-backed loan",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Laptop Computer",
      category: "credit_card",
      principal: 27492,
      outstandingBalance: 13746,
      monthlyPayment: 4582,
      interestRatePercent: 0,
      startDate: addMonthsUtc(currentMonth, -6),
      termMonths: 12,
      status: "on track",
      isActive: true,
      notes: "Installment purchase",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      name: "Balance Conversion",
      category: "credit_card",
      principal: 18207.42,
      outstandingBalance: 5820,
      monthlyPayment: 1655.22,
      interestRatePercent: 5,
      startDate: addMonthsUtc(currentMonth, -25),
      termMonths: 36,
      status: "halfway there",
      isActive: true,
      notes: "Card conversion plan",
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
  ]);

  const snapshotSeries = last8Months.map((monthDate, index) => {
    const growth = 17250 * index;
    const assetsTotal = 2380000 + growth + index * 1320;
    const liabilitiesTotal = Math.max(160000 - index * 5100, 62000);
    return {
      month: monthKey(monthDate),
      netWorth: assetsTotal - liabilitiesTotal,
      assetsTotal,
      liabilitiesTotal,
      sourceUpdatedAt: nowStamp,
      capturedAt: txDate(monthDate, 27),
      createdAt: nowStamp,
      updatedAt: nowStamp,
    };
  });

  await netWorthCollection.insertMany(snapshotSeries);

  await salaryCollection.insertOne({
    month: currentMonthKey,
    grossPay: 44494,
    netPay: 29323.79,
    takeHomeRatio: 65.9,
    earnings: [
      { name: "Basic Pay", amount: 42494, isTaxable: true },
      { name: "Non-taxable Allowance", amount: 2000, isTaxable: false },
    ],
    deductions: [
      { name: "Withholding Tax", amount: 1590, category: "tax" },
      { name: "GSIS Contribution", amount: 3824.46, category: "government" },
      { name: "PhilHealth", amount: 584.29, category: "medical" },
      { name: "PAG-IBIG", amount: 849.88, category: "government" },
      { name: "Voluntary Savings", amount: 4000, category: "savings" },
    ],
    loanDeductions: [{ name: "GSIS Loan", amount: 4321.58, category: "loan" }],
    notes: "Generated from monthly payslip",
    createdAt: nowStamp,
    updatedAt: nowStamp,
  });

  await mongoose.disconnect();
  console.log("Seed data inserted successfully for dashboard, assets, and debts.");
}

run().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
