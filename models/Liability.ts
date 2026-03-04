import { model, models, Schema, type InferSchemaType } from "mongoose";

const liabilitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["loan", "credit_card", "mortgage", "other"],
      default: "loan",
    },
    principal: { type: Number, required: true, min: 0 },
    outstandingBalance: { type: Number, required: true, min: 0 },
    monthlyPayment: { type: Number, required: true, min: 0 },
    monthlyAmortization: { type: Number, default: 0, min: 0 },
    interestRatePercent: { type: Number, default: 0, min: 0 },
    dateIncurred: { type: Date },
    startDate: { type: Date },
    termMonths: { type: Number, default: 0, min: 0 },
    paymentHistory: {
      type: [
        new Schema(
          {
            monthKey: { type: String, required: true },
            paid: { type: Boolean, default: false },
            paidAt: { type: Date },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    paidInstallmentsCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["newly opened", "on track", "halfway there", "closed"], default: "on track" },
    lastActiveStatus: { type: String, enum: ["newly opened", "on track", "halfway there"], default: "on track" },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
  },
);

liabilitySchema.index({ isActive: 1, category: 1 });
liabilitySchema.index({ outstandingBalance: -1 });
liabilitySchema.index({ monthlyPayment: -1 });

export type LiabilityDocument = InferSchemaType<typeof liabilitySchema>;

export const Liability = models.Liability || model("Liability", liabilitySchema);
