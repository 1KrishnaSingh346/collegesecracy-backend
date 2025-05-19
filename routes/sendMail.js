// routes/sendMail.js
import express from 'express';
import { sendEmail } from '../controllers/emailController.js';

const router = express.Router();

// This creates endpoint: POST /api/v1/contact/send
router.post('/send', sendEmail);

export default router;