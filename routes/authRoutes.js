import express from 'express';
import {
  signup,
  login,
  logout,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword
} from '../controllers/authController.js';

const router = express.Router();

// Public routes (no authentication needed)
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

// Protected routes (require authentication)
router.patch('/update-password', protect, updatePassword);

// Admin routes (require authentication + admin role)
// Note: Currently empty as per original structure
// router.use(protect);
// router.use(restrictTo('admin'));

export default router;