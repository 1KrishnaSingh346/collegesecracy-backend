import Notification from '../models/Notification.js';
import {User} from '../models/User.js';
import UserPurchase_Schema from "../models/UserPurchaseSchema.js";
import { generateInvoice } from './generateInvoice.js';
import { sendInvoiceMail } from './mailer.js';

// 🔁 Handle Successful Payment
export const handlePaymentCaptured = async (payment, source = 'webhook') => {
  const purchase = await UserPurchase_Schema.findOne({ orderId: payment.order_id })
    .populate('userId')
    .populate('planId');

  if (!purchase) throw new Error('Purchase record not found');
  if (purchase.status === 'paid') return { message: 'Already processed' };

  const user = await User.findById(purchase.userId._id);
  const plan = purchase.planId;
  const planType = plan.planType || plan.Plantype;

  // ✅ Update purchase
  purchase.status = 'paid';
  purchase.paymentId = payment.id;
  purchase.paymentMethod = payment.method;
  purchase.bank = payment.bank;
  purchase.wallet = payment.wallet;
  purchase.email = payment.email;
  purchase.contact = payment.contact;
  await purchase.save();

  // ✅ Update user access
  if (planType === 'counselling') {
    const planData = {
      planId: plan._id,
      paymentId: payment.id,
      planName: plan.title
    };
    if (!user.hasActiveCounselingPlan(plan._id)) {
      await user.addCounselingPlan(planData);
    }
  } else if (planType === 'tool') {
    if (!user.hasPremiumTool(plan._id)) {
      await user.addPremiumTool(plan._id, plan._id, plan.title, payment.id, true);
    }
  }

  // ✅ Notification
  await Notification.create({
    type: 'payment_processed',
    message: `Payment of ₹${purchase.amount} for ${plan.title} by ${user.fullName}`,
    userId: user._id,
    metadata: {
      amount: purchase.amount,
      plan: plan.title,
      paymentId: payment.id
    }
  });

  // ✅ Generate invoice PDF and send mail
  try {
   const invoicePath = await generateInvoice({ user, plan, payment, purchase});
    await sendInvoiceMail(user.email, user.fullName, invoicePath);
  } catch (err) {
    console.error('❌ Invoice generation or email sending failed:', err.message);
  }

  return { message: `Payment processed successfully via ${source}` };
};

// ❌ Handle Payment Failure
export const handlePaymentFailed = async (payment) => {
  const purchase = await UserPurchase_Schema.findOne({ orderId: payment.order_id })
    .populate('userId')
    .populate('planId');

  if (!purchase) throw new Error('Purchase not found');

  const user = purchase.userId;
  const plan = purchase.planId;

  purchase.status = 'failed';
  purchase.paymentId = payment.id;
  purchase.paymentMethod = payment.method;
  purchase.bank = payment.bank;
  purchase.wallet = payment.wallet;
  purchase.email = payment.email;
  purchase.contact = payment.contact;
  await purchase.save();

  await Notification.create({
    type: 'payment_failed',
    message: `Payment failed for ₹$₹${(purchase.amount / 100).toFixed(2)} - ${plan.title}`,
    userId: user._id,
    metadata: {
      amount: purchase.amount,
      plan: plan.title,
      paymentId: payment.id,
      reason: payment.error_description || 'Unknown error'
    }
  });

  return { message: 'Payment failure recorded' };
};

// 💸 Handle Refund
export const handleRefundProcessed = async (payment) => {
  const purchase = await UserPurchase_Schema.findOne({ orderId: payment.order_id })
    .populate('userId')
    .populate('planId');

  if (!purchase) throw new Error('Purchase not found');

  const user = purchase.userId;
  const plan = purchase.planId;

  purchase.status = 'refunded';
  await purchase.save();

  await Notification.create({
    type: 'payment_refunded',
    message: `Refund processed for ${plan.title} - ₹${purchase.amount}`,
    userId: user._id,
    metadata: {
      amount: purchase.amount,
      plan: plan.title,
      paymentId: payment.id
    }
  });

  return { message: 'Refund processed' };
};

// 📦 Event Map
export const eventHandlers = {
  'payment.captured': handlePaymentCaptured,
  'payment.failed': handlePaymentFailed,
  'payment.refunded': handleRefundProcessed,
  'refund.processed': handleRefundProcessed
};
