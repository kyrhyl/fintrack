import { ZodError } from "zod";

import { fail, ok } from "@/lib/api";
import { requireApiAuth } from "@/lib/auth/require-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { STOCK_PORTFOLIO_ASSET_NAME, STOCK_PORTFOLIO_ASSET_NOTE_TAG } from "@/lib/stocks/constants";
import { assetCreateSchema } from "@/lib/validation";
import { Asset } from "@/models/Investment";

type SortBy = "currentValue" | "acquiredAt" | "createdAt" | "name";

function parseNumber(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();
  const type = (url.searchParams.get("type") || "").trim();
  const page = parseNumber(url.searchParams.get("page"), 1);
  const limit = Math.min(parseNumber(url.searchParams.get("limit"), 25), 100);
  const sortByParam = (url.searchParams.get("sortBy") || "currentValue") as SortBy;
  const orderParam = (url.searchParams.get("order") || "desc").toLowerCase();

  const sortBy: SortBy = ["currentValue", "acquiredAt", "createdAt", "name"].includes(sortByParam)
    ? sortByParam
    : "currentValue";
  const order = orderParam === "asc" ? 1 : -1;

  const filter: Record<string, unknown> = { isActive: true };
  const conditions: Record<string, unknown>[] = [];

  if (query) {
    conditions.push({
      $or: [
      { name: { $regex: query, $options: "i" } },
      { institution: { $regex: query, $options: "i" } },
      ],
    });
  }

  const aggregateStockCondition = {
    type: "stock",
    $or: [
      { notes: { $regex: STOCK_PORTFOLIO_ASSET_NOTE_TAG, $options: "i" } },
      { name: STOCK_PORTFOLIO_ASSET_NAME },
    ],
  };

  const hasAggregateStock = await (async () => {
    await connectToDatabase();
    const existing = await Asset.exists(aggregateStockCondition);
    return Boolean(existing);
  })();

  if (type) {
    if (type === "stock") {
      conditions.push(hasAggregateStock ? aggregateStockCondition : { type: "stock" });
    } else {
      conditions.push({ type });
    }
  } else {
    conditions.push({
      $or: [{ type: { $ne: "stock" } }, hasAggregateStock ? aggregateStockCondition : { type: "stock" }],
    });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const [items, total] = await Promise.all([
    Asset.find(filter)
      .sort({ [sortBy]: order, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Asset.countDocuments(filter),
  ]);

  return ok({ items, total, page, limit });
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const payload = assetCreateSchema.parse(await request.json());

    if (payload.type === "stock") {
      return fail("FORBIDDEN", "Create stock details from Stock Portfolio page.", 403);
    }

    await connectToDatabase();
    const created = await Asset.create({
      ...payload,
      isActive: payload.isActive ?? true,
    });

    return ok(created.toObject(), 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("VALIDATION_ERROR", error.issues[0]?.message || "Invalid request body.", 422);
    }

    return fail("INTERNAL_ERROR", "Unable to create asset.", 500);
  }
}
