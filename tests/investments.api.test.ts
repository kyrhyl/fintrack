import { DELETE as deleteAsset, GET as getAssetById, PATCH as patchAsset } from "@/app/api/assets/[id]/route";
import { GET as listAssets, POST as createAsset } from "@/app/api/assets/route";
import { connectToDatabase } from "@/lib/mongodb";

describe("assets api", () => {
  beforeEach(async () => {
    await connectToDatabase();
  });

  it("creates an asset entry", async () => {
    const request = new Request("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Fund",
        type: "fund",
        currentValue: 50000,
        annualYieldPercent: 4,
        monthlyIncome: 166.67,
        institution: "Sample Bank",
        isLiquid: true,
      }),
    });

    const response = await createAsset(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("New Fund");
  });

  it("rejects invalid payload on create", async () => {
    const request = new Request("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        currentValue: -100,
      }),
    });

    const response = await createAsset(request);
    expect(response.status).toBe(422);
  });

  it("blocks creating stock details in assets api", async () => {
    const request = new Request("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "JFC",
        type: "stock",
        currentValue: 10000,
      }),
    });

    const response = await createAsset(request);
    expect(response.status).toBe(403);
  });

  it("updates and permanently deletes asset", async () => {
    const createRequest = new Request("http://localhost/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Editable Asset",
        type: "fund",
        currentValue: 120000,
      }),
    });

    const createResponse = await createAsset(createRequest);
    const createBody = await createResponse.json();
    const id = createBody.data._id as string;

    const updateRequest = new Request(`http://localhost/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentValue: 125000 }),
    });

    const updateResponse = await patchAsset(updateRequest, { params: Promise.resolve({ id }) });
    const updateBody = await updateResponse.json();
    expect(updateBody.data.currentValue).toBe(125000);

    const deleteResponse = await deleteAsset(new Request(`http://localhost/api/assets/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(deleteResponse.status).toBe(200);

    const deleteBody = await deleteResponse.json();
    expect(deleteBody.data.deleted).toBe(true);

    const activeListResponse = await listAssets(new Request("http://localhost/api/assets"));
    const activeListBody = await activeListResponse.json();
    expect(activeListBody.data.items).toHaveLength(0);

    const getByIdResponse = await getAssetById(new Request(`http://localhost/api/assets/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(getByIdResponse.status).toBe(404);
  });
});
