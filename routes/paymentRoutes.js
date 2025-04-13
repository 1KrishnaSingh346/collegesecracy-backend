
// paymentRoutes.js
import express from 'express';
import { protect, checkPremium } from '../middlewares/auth.js';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

export default router;