import { GET as getDebtsOverview } from "@/app/api/debts/overview/route";
import { PATCH as patchLiabilityPayment } from "@/app/api/liabilities/[id]/payment/route";
import { toMonthKey } from "@/lib/month";
import { connectToDatabase } from "@/lib/mongodb";
import { Liability } from "@/models/Liability";
import { RecurringExpense } from "@/models/RecurringExpense";

describe("debts overview api", () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it("preserves zero debt projection progress", async () => {
    await Liability.create({
      name: "Fresh Loan",
      category: "loan",
      principal: 10000,
      outstandingBalance: 10000,
      monthlyPayment: 1000,
      interestRatePercent: 0,
      status: "newly opened",
      isActive: true,
    });

    const response = await getDebtsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.projection.progress).toBe(0);
  });

  it("returns remaining payoff months and excludes debt recurring items", async () => {
    await Liability.create({
      name: "Auto Loan",
      category: "loan",
      principal: 10000,
      outstandingBalance: 10000,
      monthlyPayment: 1000,
      interestRatePercent: 0,
      status: "newly opened",
      isActive: true,
    });

    await RecurringExpense.create({
      name: "Credit Card Installment",
      amount: 500,
      category: "credit_card",
      recurrenceRule: "monthly",
      nextDueDate: new Date(),
      isActive: true,
    });

    await RecurringExpense.create({
      name: "Internet",
      amount: 1499,
      category: "utilities",
      recurrenceRule: "monthly",
      nextDueDate: new Date(),
      isActive: true,
    });

    const response = await getDebtsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.projection.remainingMonths).toBe(10);
    expect(body.data.recurringBills).toEqual([{ name: "Internet", amount: 1499 }]);
  });

  it("reduces outstanding balance when current month is marked paid", async () => {
    const liability = await Liability.create({
      name: "Installment Loan",
      category: "loan",
      principal: 12000,
      outstandingBalance: 12000,
      monthlyPayment: 1000,
      monthlyAmortization: 1000,
      dateIncurred: new Date(Date.UTC(2026, 0, 1)),
      termMonths: 12,
      status: "on track",
      isActive: true,
    });

    const beforeResponse = await getDebtsOverview();
    const beforeBody = await beforeResponse.json();
    const beforeLoan = beforeBody.data.loans.find((loan: { id?: string }) => loan.id === String(liability._id));

    await patchLiabilityPayment(
      new Request(`http://localhost/api/liabilities/${liability._id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      }),
      { params: Promise.resolve({ id: String(liability._id) }) },
    );

    const afterResponse = await getDebtsOverview();
    const afterBody = await afterResponse.json();
    const afterLoan = afterBody.data.loans.find((loan: { id?: string }) => loan.id === String(liability._id));

    expect(beforeLoan).toBeTruthy();
    expect(afterLoan).toBeTruthy();
    expect(afterLoan.paidThisMonth).toBe(true);
    expect(afterLoan.overdueInstallments).toBe(0);
    expect(afterLoan.totalDebt).toBe(beforeLoan.totalDebt - beforeLoan.overdueInstallments * 1000);
  });

  it("auto-closes and auto-hides liabilities when fully paid", async () => {
    const liability = await Liability.create({
      name: "One Month Loan",
      category: "loan",
      principal: 1000,
      outstandingBalance: 1000,
      monthlyPayment: 1000,
      monthlyAmortization: 1000,
      dateIncurred: new Date(Date.UTC(2026, 0, 1)),
      termMonths: 1,
      status: "halfway there",
      lastActiveStatus: "halfway there",
      isActive: true,
    });

    await patchLiabilityPayment(
      new Request(`http://localhost/api/liabilities/${liability._id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      }),
      { params: Promise.resolve({ id: String(liability._id) }) },
    );

    const refreshed = await Liability.findById(liability._id).lean();
    expect(refreshed).toBeTruthy();
    expect(refreshed?.status).toBe("closed");
    expect(refreshed?.isActive).toBe(false);
    expect(refreshed?.lastActiveStatus).toBe("halfway there");
  });

  it("reopens closed liabilities and restores prior active status", async () => {
    const now = new Date();
    const currentMonthKey = toMonthKey(now);
    const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const previousMonthKey = toMonthKey(previousMonth);

    const liability = await Liability.create({
      name: "Closed Loan",
      category: "loan",
      principal: 2000,
      outstandingBalance: 0,
      monthlyPayment: 1000,
      monthlyAmortization: 1000,
      dateIncurred: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
      termMonths: 2,
      status: "closed",
      lastActiveStatus: "halfway there",
      isActive: false,
      paymentHistory: [
        { monthKey: previousMonthKey, paid: true, paidAt: now },
        { monthKey: currentMonthKey, paid: true, paidAt: now },
      ],
    });

    await patchLiabilityPayment(
      new Request(`http://localhost/api/liabilities/${liability._id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: false }),
      }),
      { params: Promise.resolve({ id: String(liability._id) }) },
    );

    const refreshed = await Liability.findById(liability._id).lean();
    expect(refreshed).toBeTruthy();
    expect(refreshed?.status).toBe("halfway there");
    expect(refreshed?.isActive).toBe(true);
    expect(refreshed?.outstandingBalance).toBeGreaterThan(0);
  });

  it("excludes closed liabilities from debt KPIs and projection", async () => {
    await Liability.create({
      name: "Active KPI Loan",
      category: "loan",
      principal: 10000,
      outstandingBalance: 10000,
      monthlyPayment: 1000,
      monthlyAmortization: 1000,
      dateIncurred: new Date(),
      termMonths: 10,
      status: "on track",
      lastActiveStatus: "on track",
      isActive: true,
    });

    await Liability.create({
      name: "Closed KPI Loan",
      category: "loan",
      principal: 5000,
      outstandingBalance: 0,
      monthlyPayment: 500,
      monthlyAmortization: 500,
      dateIncurred: new Date(Date.UTC(2025, 0, 1)),
      termMonths: 10,
      status: "closed",
      lastActiveStatus: "on track",
      isActive: false,
      paymentHistory: [{ monthKey: toMonthKey(new Date()), paid: true, paidAt: new Date() }],
    });

    const response = await getDebtsOverview();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.projection.remainingMonths).toBe(10);
    expect(body.data.loans.some((loan: { name: string; status: string }) => loan.name === "Closed KPI Loan" && loan.status === "closed")).toBe(true);
    const totalDebtCard = body.data.stats.find((card: { label: string; value: string }) => card.label === "Total Debt");
    expect(totalDebtCard?.value).toContain("10,000.00");
  });
});
