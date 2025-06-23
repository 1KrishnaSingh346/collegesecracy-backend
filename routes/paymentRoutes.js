import express from 'express';
import { createOrder, verifyPayment, paymentWebhook } from '../controllers/paymentController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentWebhook);

export default router;