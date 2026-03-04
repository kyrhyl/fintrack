import { Types } from "mongoose";

import { POST as postBudget } from "@/app/api/budget/[month]/route";
import { GET as getOverview } from "@/app/api/dashboard/overview/route";
import { connectToDatabase } from "@/lib/mongodb";
import { BudgetPlan } from "@/models/BudgetPlan";
import { RecurringExpense } from "@/models/RecurringExpense";
import { Transaction } from "@/models/Transaction";

describe("budget and dashboard api", () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it("applies carry-over from previous month when creating a new plan", async () => {
    await BudgetPlan.create({
      month: "2026-02",
      plannedIncome: 50000,
      allocationStrategy: "fixed",
      carryOverEnabled: false,
      status: "draft",
      categories: [
        { name: "debt", type: "fixed", plannedAmount: 3000, percentage: 0, recurrence: "monthly" },
      ],
    });

    await Transaction.create({
      title: "Loan Payment",
      kind: "expense",
      category: "debt",
      amount: 2000,
      transactionDate: new Date("2026-02-10T00:00:00.000Z"),
      notes: "",
    });

    const request = new Request("http://localhost/api/budget/2026-03", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedIncome: 52000,
        allocationStrategy: "fixed",
        carryOverEnabled: true,
        status: "draft",
        categories: [
          {
            name: "debt",
            type: "fixed",
            plannedAmount: 1000,
            percentage: 0,
            recurrence: "monthly",
          },
        ],
      }),
    });

    const response = await postBudget(request, { params: Promise.resolve({ month: "2026-03" }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.carryOver).toMatchObject({ applied: true, sourceMonth: "2026-02", amount: 1000 });
    expect(body.data.plan.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "debt",
          plannedAmount: 2000,
        }),
      ]),
    );
  });

  it("rejects invalid percentage allocation that exceeds 100", async () => {
    const request = new Request("http://localhost/api/budget/2026-04", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedIncome: 50000,
        allocationStrategy: "percentage",
        carryOverEnabled: false,
        status: "draft",
        categories: [
          {
            name: "needs",
            type: "percentage",
            plannedAmount: 0,
            percentage: 70,
            recurrence: "monthly",
          },
          {
            name: "wants",
            type: "percentage",
            plannedAmount: 0,
            percentage: 40,
            recurrence: "monthly",
          },
        ],
      }),
    });

    const response = await postBudget(request, { params: Promise.resolve({ month: "2026-04" }) });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns dashboard overview aggregates for selected month", async () => {
    await BudgetPlan.create({
      month: "2026-02",
      plannedIncome: 60000,
      allocationStrategy: "fixed",
      carryOverEnabled: false,
      status: "draft",
      categories: [
        { name: "debt", type: "fixed", plannedAmount: 10000, percentage: 0, recurrence: "monthly" },
        { name: "utilities", type: "fixed", plannedAmount: 5000, percentage: 0, recurrence: "monthly" },
      ],
    });

    await Transaction.create([
      {
        _id: new Types.ObjectId(),
        title: "Salary",
        kind: "income",
        category: "salary",
        amount: 60000,
        transactionDate: new Date("2026-02-01T00:00:00.000Z"),
        notes: "",
      },
      {
        _id: new Types.ObjectId(),
        title: "Debt Payment",
        kind: "expense",
        category: "debt",
        amount: 9000,
        transactionDate: new Date("2026-02-10T00:00:00.000Z"),
        notes: "",
      },
      {
        _id: new Types.ObjectId(),
        title: "Internet",
        kind: "expense",
        category: "utilities",
        amount: 2000,
        transactionDate: new Date("2026-02-11T00:00:00.000Z"),
        notes: "",
      },
    ]);

    await RecurringExpense.create({
      name: "Netflix",
      amount: 500,
      category: "subscriptions",
      recurrenceRule: "monthly",
      nextDueDate: new Date(),
      autoCreateTransaction: false,
      isActive: true,
    });

    const response = await getOverview(new Request("http://localhost/api/dashboard/overview?month=2026-02"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.kpis.monthIncome).toBe(60000);
    expect(body.data.kpis.monthExpenses).toBe(11000);
    expect(body.data.kpis.monthCashFlow).toBe(49000);
    expect(body.data.budget.exists).toBe(true);
    expect(body.data.topExpenseCategories.length).toBeGreaterThan(0);
  });

  it("returns 201 on create and 200 on update for monthly budget plan", async () => {
    const createRequest = new Request("http://localhost/api/budget/2026-05", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedIncome: 50000,
        allocationStrategy: "fixed",
        carryOverEnabled: false,
        status: "draft",
        categories: [
          {
            name: "debt",
            type: "fixed",
            plannedAmount: 12000,
            percentage: 0,
            recurrence: "monthly",
          },
        ],
      }),
    });

    const createResponse = await postBudget(createRequest, { params: Promise.resolve({ month: "2026-05" }) });
    expect(createResponse.status).toBe(201);

    const updateRequest = new Request("http://localhost/api/budget/2026-05", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedIncome: 52000,
        allocationStrategy: "fixed",
        carryOverEnabled: false,
        status: "draft",
        categories: [
          {
            name: "debt",
            type: "fixed",
            plannedAmount: 13000,
            percentage: 0,
            recurrence: "monthly",
          },
        ],
      }),
    });

    const updateResponse = await postBudget(updateRequest, { params: Promise.resolve({ month: "2026-05" }) });
    expect(updateResponse.status).toBe(200);
  });
});
