import mongoose from "mongoose";

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, required: true, trim: true, uppercase: true },
    skuCode: { type: String, required: true, trim: true, uppercase: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

colorSchema.index({ skuCode: 1 }, { unique: true });
colorSchema.index({ hex: 1 }, { unique: true });

const colorModel = mongoose.models.color || mongoose.model("color", colorSchema);

export default colorModel;
