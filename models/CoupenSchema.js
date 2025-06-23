import mongoose from "mongoose";

const CoupenScehma = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    DiscountPercent: {
      type: Number,
      required: true,
    },
    ExpiryDate: {
      type: Date,
      required: true,
    },
    ApplicableType: [{ type: String, enum: ["counselling", "tool"] }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Coupen_Schema", CoupenScehma);