import express from 'express';
import { protect } from '../middlewares/auth.js';
import { createOrder, verifyPayment, getPaymentDetails } from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);
router.get('/payment-details/:paymentId', getPaymentDetails);

export default router;