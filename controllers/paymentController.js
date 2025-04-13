import Razorpay from 'razorpay';
import { User } from '../models/User.js';
import AppError from '../utils/appError.js';
import razorpay from '../config/razorpay.js';

export const createOrder = async (req, res, next) => {
  try {
    const options = {
      amount: 29900, // ₹299 in paise
      currency: 'INR',
      receipt: `receipt_${req.user.id}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      status: 'success',
      data: {
        order,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return next(new AppError('Payment verification failed', 400));
    }

    await User.findByIdAndUpdate(req.user.id, {
      premium: true,
      premiumSince: Date.now()
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment verified and premium access granted'
    });
  } catch (err) {
    next(err);
  }
};