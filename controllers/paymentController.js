import { User } from '../models/User.js';
import AppError from '../utils/appError.js';
import razorpay from '../config/razorpay.js';
import crypto from 'crypto';

export const createOrder = async (req, res, next) => {
  try {
    const { amount, planType } = req.body;
    console.log(amount);
    console.log(planType);

    res.status(200).json({
      status :"success",
      data:{
        amount,
        planType
      }
    })
    
  //   // Validate amount
  //   if (!amount || isNaN(amount)) {
  //     return next(new AppError('Invalid payment amount', 400));
  //   }

  //   const options = {
  //     amount: amount * 100, // Convert to paise
  //     currency: 'INR',
  //     receipt: `receipt_${req.user.id}_${Date.now()}`,
  //     notes: {
  //       planType: planType || 'premium',
  //       userId: req.user.id
  //     }
  //   };

  //   const order = await razorpay.orders.create(options);

  //   res.status(200).json({
  //     status: 'success',
  //     data: {
  //       order,
  //       key: process.env.RAZORPAY_KEY_ID
  //     }
  //   });
  } 
  catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planType } = req.body;
    const userId = req.user.id;

    // Verify payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return next(new AppError('Payment verification failed', 400));
    }

    let updateData = {};
    const now = new Date();
    
    if (planType === 'premium') {
      // Premium membership purchase
      updateData = {
        premium: true,
        premiumSince: now,
        subscriptionPlan: 'premium',
        subscriptionPlanPrice: 299
      };
    } else {
      // Counseling plan purchase
      let validityDate = new Date();
      
      // Set validity based on plan type
      switch(planType) {
        case 'josaa':
          validityDate.setMonth(now.getMonth() + 6); // 6 months validity
          updateData = {
            'counselingPlans.josaa': {
              active: true,
              purchasedOn: now,
              validUntil: validityDate,
              paymentId: razorpay_payment_id
            }
          };
          break;
        case 'jac-delhi':
          validityDate.setMonth(now.getMonth() + 4); // 4 months validity
          updateData = {
            'counselingPlans.jacDelhi': {
              active: true,
              purchasedOn: now,
              validUntil: validityDate,
              paymentId: razorpay_payment_id
            }
          };
          break;
        case 'uptac':
          validityDate.setMonth(now.getMonth() + 4); // 4 months validity
          updateData = {
            'counselingPlans.uptac': {
              active: true,
              purchasedOn: now,
              validUntil: validityDate,
              paymentId: razorpay_payment_id
            }
          };
          break;
        case 'whatsapp':
          validityDate.setMonth(now.getMonth() + 6); // 6 months validity
          updateData = {
            'counselingPlans.whatsapp': {
              active: true,
              purchasedOn: now,
              validUntil: validityDate,
              paymentId: razorpay_payment_id,
              whatsappGroupLink: `https://chat.whatsapp.com/${crypto.randomBytes(8).toString('hex')}`
            }
          };
          break;
        default:
          return next(new AppError('Invalid plan type', 400));
      }
    }

    // Update user data
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: planType === 'premium' 
        ? 'Premium membership activated successfully' 
        : 'Counseling plan activated successfully',
      data: {
        user,
        whatsappLink: planType === 'whatsapp' 
          ? updateData.counselingPlans.whatsapp.whatsappGroupLink 
          : null
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getPaymentDetails = async (req, res, next) => {
  try {
    const paymentId = req.params.paymentId;
    const payment = await razorpay.payments.fetch(paymentId);
    
    res.status(200).json({
      status: 'success',
      data: {
        payment
      }
    });
  } catch (err) {
    next(err);
  }
};