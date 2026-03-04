import { GET as getSalaryOverview } from "@/app/api/salary/overview/route";
import { PUT as putSalary } from "@/app/api/salary/route";
import { connectToDatabase } from "@/lib/mongodb";
import { Liability } from "@/models/Liability";
import { SalaryRecord } from "@/models/SalaryRecord";

describe("salary overview api", () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it("computes take-home ratio when stored ratio is missing or zero", async () => {
    await SalaryRecord.create({
      month: "2026-02",
      grossPay: 10000,
      netPay: 5000,
      earnings: [],
      deductions: [],
      loanDeductions: [],
    });

    const response = await getSalaryOverview(new Request("http://localhost/api/salary/overview?month=2026-02"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.exists).toBe(true);
    expect(body.data.data.takeHomeRatio).toBe(50);
  });

  it("auto-applies mapped loan deductions to liabilities", async () => {
    const liability = await Liability.create({
      name: "GSIS Payroll Loan",
      category: "loan",
      principal: 10000,
      outstandingBalance: 10000,
      monthlyPayment: 1000,
      monthlyAmortization: 1000,
      termMonths: 10,
      dateIncurred: new Date("2026-01-01T00:00:00.000Z"),
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      paymentHistory: [],
      paidInstallmentsCount: 0,
      status: "on track",
      isActive: true,
    });

    const response = await putSalary(
      new Request("http://localhost/api/salary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: "2026-03",
          grossPay: 20000,
          netPay: 15000,
          earnings: [{ name: "Basic Pay", amount: 20000, isTaxable: true }],
          deductions: [{ name: "Tax", amount: 4000, category: "tax" }],
          loanDeductions: [
            {
              name: "GSIS Payroll Loan",
              amount: 1000,
              category: "loan",
              liabilityId: String(liability._id),
            },
          ],
        }),
      }),
    );

    const body = await response.json();
    const updatedLiability = await Liability.findById(liability._id).lean();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.loanDeductions[0].applied).toBe(true);
    expect(updatedLiability?.paymentHistory?.some((item: { monthKey: string; paid: boolean }) => item.monthKey === "2026-03" && item.paid)).toBe(true);
    expect(updatedLiability?.outstandingBalance).toBe(9000);
  });
});
