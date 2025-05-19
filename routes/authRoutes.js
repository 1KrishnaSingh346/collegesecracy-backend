import express from 'express';
import {
  checkSession,
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

router.get("/check-session",protect, checkSession);
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout',protect, logout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

router.patch('/update-password', protect, updatePassword);
export default router;