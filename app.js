import "dotenv/config";
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import premiumRoutes from './routes/premiumRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import mentorRoutes from './routes/mentorRoutes.js';
import emailRoutes from './routes/email.route.js';
import sendMailRouter from './routes/sendMail.js';

import AppError from './utils/appError.js';
import { globalErrorHandler, notFoundHandler } from './controllers/errorController.js';

const app = express();

// CORS configuration based on environment
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true
};

if (process.env.ENV_MODE === 'production') {
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

// Common middleware
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/premium', premiumRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/mentor', mentorRoutes);
app.use('/api/v1/email', emailRoutes); // Fixed: added missing forward slash
app.use('/api/v1/contact', sendMailRouter);   // For user email sending contact form


// Error handling
if (process.env.ENV_MODE === 'production') {
  // In production, you might want to log errors differently
  app.use((err, req, res, next) => {
    console.error(err.stack);
    next(err);
  });
}

app.use(globalErrorHandler);

// Handle 404 routes (uncomment if needed)
// app.all('*', notFoundHandler);


export default app;