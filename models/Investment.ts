import { model, models, Schema, type InferSchemaType } from "mongoose";

const investmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "cash",
        "bank_account",
        "time_deposit",
        "money_market",
        "stock",
        "etf",
        "fund",
        "bond",
        "reit",
        "retirement",
        "cooperative",
        "mp2",
        "real_estate",
        "vehicle",
        "business_equity",
        "receivable",
        "crypto",
        "precious_metal",
        "collectible",
        "other",
      ],
      default: "other",
    },
    currentValue: { type: Number, required: true, min: 0 },
    annualYieldPercent: { type: Number, default: 0, min: 0 },
    monthlyIncome: { type: Number, default: 0, min: 0 },
    institution: { type: String, default: "", trim: true },
    isLiquid: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    acquiredAt: { type: Date },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

investmentSchema.index({ isActive: 1, type: 1 });
investmentSchema.index({ currentValue: -1 });
investmentSchema.index({ institution: 1, isActive: 1 });

export type InvestmentDocument = InferSchemaType<typeof investmentSchema>;

export type AssetDocument = InvestmentDocument;

export const Asset = models.Asset || models.Investment || model("Asset", investmentSchema, "investments");

export const Investment = Asset;
