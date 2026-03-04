import { DELETE as deleteLiability, PATCH as patchLiability } from "@/app/api/liabilities/[id]/route";
import { PATCH as patchLiabilityPayment } from "@/app/api/liabilities/[id]/payment/route";
import { GET as getLiabilities, POST as createLiability } from "@/app/api/liabilities/route";
import { connectToDatabase } from "@/lib/mongodb";

describe("liabilities api", () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it("supports create, list, update, and delete", async () => {
    const createResponse = await createLiability(
      new Request("http://localhost/api/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Loan",
          category: "loan",
          dateIncurred: "2025-01-01",
          monthlyAmortization: 2500,
          termMonths: 10,
          status: "newly opened",
          isActive: true,
        }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody.success).toBe(true);

    const listResponse = await getLiabilities();
    const listBody = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listBody.success).toBe(true);
    expect(listBody.data.total).toBe(1);

    const id = String(createBody.data._id);
    const updateResponse = await patchLiability(
      new Request(`http://localhost/api/liabilities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyAmortization: 3000, status: "on track" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    const updateBody = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.monthlyPayment).toBe(3000);

    const paymentResponse = await patchLiabilityPayment(
      new Request(`http://localhost/api/liabilities/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      }),
      { params: Promise.resolve({ id }) },
    );
    const paymentBody = await paymentResponse.json();

    expect(paymentResponse.status).toBe(200);
    expect(paymentBody.success).toBe(true);
    expect(paymentBody.data.paymentHistory.length).toBeGreaterThan(0);
    expect(paymentBody.data.paymentHistory.every((item: { paid: boolean }) => item.paid)).toBe(true);
    expect(paymentBody.data.outstandingBalance).toBeGreaterThanOrEqual(0);

    const deleteResponse = await deleteLiability(new Request(`http://localhost/api/liabilities/${id}`), {
      params: Promise.resolve({ id }),
    });
    const deleteBody = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.success).toBe(true);
    expect(deleteBody.data.deleted).toBe(true);
  });
});
