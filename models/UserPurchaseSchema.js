import mongoose from "mongoose";

const UserPurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  paymentId: { type: String, required: false },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  fullName: {type: String, required:true},
  PlanName : {type:String, required:true},
  status: { 
    type: String, 
    enum: ['created', 'attempted', 'paid', 'failed', 'refunded'],
    default: 'created'
  },
  validity: { 
    type: Date, 
    required: true,
    default: () => new Date('2099-12-31') // Default lifetime for tools
  },

  boughtAt: { type: Date, default: Date.now },
  couponUsed: { type: String, default: null },
  receipt: { type: String, required: true },
  paymentMethod: { type: String },
  bank: { type: String },
  wallet: { type: String },
  email: { type: String },
  contact: { type: String },
  isBundle: { type: Boolean, default: false } // Flag for bundle purchases
}, { timestamps: true });

export default mongoose.model('UserPurchase', UserPurchaseSchema);