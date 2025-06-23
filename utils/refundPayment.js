import Razorpay from '../../config/razorpay.js';
import UserPurchase_Schema from '../../models/UserPurchaseSchema.js';
import Notification from '../../models/Notification.js';

export const refundPayment = async (req, res) => {
  try {
    const { purchaseId } = req.body;

    const purchase = await UserPurchase_Schema.findById(purchaseId).populate('userId').populate('planId');

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    if (purchase.status !== 'paid') {
      return res.status(400).json({ message: 'Refund allowed only on paid purchases' });
    }

    // 🔁 Refund via Razorpay
    const refund = await Razorpay.payments.refund(purchase.paymentId);

    // 🗃️ Update status
    purchase.status = 'refunded';
    await purchase.save();

    const user = purchase.userId;
    const plan = purchase.planId;
    const planType = plan.planType || plan.Plantype;

    // ❌ REMOVE ACCESS
    if (planType === 'tool') {
      user.premiumTools = user.premiumTools.filter(t => t.toolId.toString() !== plan._id.toString());
    } else if (planType === 'counselling') {
      user.counselingPlans = user.counselingPlans.filter(p => p.planId.toString() !== plan._id.toString());
    }

    await user.save();

    // 🔔 Notify
    await Notification.create({
      type: 'payment_refunded',
      message: `₹${purchase.amount} refunded and access removed for ${plan.title}`,
      userId: user._id,
      metadata: {
        amount: purchase.amount,
        plan: plan.title,
        paymentId: purchase.paymentId,
        refundId: refund.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Refund successful and access removed',
      refundId: refund.id
    });

  } catch (err) {
    console.error('Refund Error:', err);
    res.status(500).json({ message: 'Refund failed', error: err.message });
  }
};

