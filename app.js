import "dotenv/config";
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path'; 
import fs from 'fs';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import menteeRoutes from './routes/menteeRoutes.js';
import emailRoutes from './routes/email.route.js';
import sendMailRouter from './routes/sendMail.js';
import publicRoutes from './routes/publicRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js';
import UserPurchase_Schema from "./models/UserPurchaseSchema.js";
import { generateInvoice } from "./utils/generateInvoice.js";
if (process.env.NODE_ENV === 'production') {
  import('./utils/invoiceCleanup.js');
}

import AppError from './utils/appError.js';
import { globalErrorHandler, notFoundHandler } from './controllers/errorController.js';

const __dirname = path.resolve();
const app = express();

// CORS configuration based on environment
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true
};

if (process.env.NODE_ENV === 'production') {
  // Production-specific middleware
  app.use(cors(corsOptions));
  app.set('trust proxy', 1); // Trust first proxy
  
  // Secure cookies, HTTPS, etc. can be configured here
} else {
  // Development-specific middleware
  app.use(cors({
    ...corsOptions,
    // More relaxed settings for development
  }));
  app.use(morgan('dev')); // Only use morgan in development
}
app.set('trust proxy', 1);

// Common middleware
app.use(express.json());
app.use(cookieParser());

// app.use(express.static(path.join(__dirname, 'dist')));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });



// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/mentee', menteeRoutes);
app.use('/api/v1/email', emailRoutes); 
app.use('/api/v1/contact', sendMailRouter);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/payments', paymentRoutes);

app.get('/api/v1/invoice/:paymentId', async (req, res) => {
  console.log("Invocie proccess started");
  const invoiceDir = path.join(process.cwd(), 'invoices');
  console.log("Invoice directory : ", invoiceDir);
if (!fs.existsSync(invoiceDir)) {
  console.log("YE bhi step hogya ");
  fs.mkdirSync(invoiceDir, { recursive: true });
}
const filePath = path.join(invoiceDir, `invoice_${req.params.paymentId}.pdf`);
  if (fs.existsSync(filePath)) {
    console.log('Invoice found on disk. Serving:', filePath);
    return res.download(filePath);
  }

  // Agar file nahi hai, tab generate karo
  try {
    const purchase = await UserPurchase_Schema.findOne({ paymentId: req.params.paymentId }).populate('userId').populate('planId');
    if (!purchase) return res.status(404).send('Purchase not found');

    const invoicePath = await generateInvoice({ 
      user: purchase.userId, 
      plan: purchase.planId, 
      payment: { id: purchase.paymentId, amount: purchase.amount }, 
      purchase 
    });
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day caching
    res.download(invoicePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating invoice');
  }
});






// Error handling
if (process.env.NODE_ENV === 'production') {
  // In production, you might want to log errors differentl
  app.use((err, req, res, next) => {
    console.error(err.stack);
    next(err);
  });
}

app.use(globalErrorHandler);

// Handle 404 routes (uncomment if needed)
// app.all('*', notFoundHandler);


export default app;
