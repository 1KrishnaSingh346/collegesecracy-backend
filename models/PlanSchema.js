import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    sessions: {
      type: String,
    },
    features: {
      type: [String],
    },
    highlight: {
      type: Boolean,
      default: false,
    },
    Plantype: {
      type: String,
      enum: ["counselling", "tool"],
      required: true,
    },
    link:
    {
      type: String,
      required: function() { return this.Plantype === 'tool'; }
    },
    expiryDate: {
      type: Date,
      required: function() { return this.Plantype === 'counselling'; }
    }
  },
  { timestamps: true }
);


export default mongoose.model('Plan', PlanSchema);