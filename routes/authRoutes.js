import express from 'express';
import {
  checkSession,
  signup,
  login,
  logout,
  resetPassword,
  updatePassword,
  verifyEmail, 
  checkVerificationStatus,
  reSendVerificationEmail,
  sendResetReactivateEmail
} from '../controllers/authController.js';
import {
    protect,
  restrictTo,
  checkIfLocked,
  refreshToken
} from "../middlewares/auth.js";

const router = express.Router();

router.get("/check-session",protect, checkSession);
router.post('/refresh-token', refreshToken);
router.post('/signup', signup);
router.post('/login', checkIfLocked, login);
router.post('/logout',protect, logout);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post("/check-verification-status", checkVerificationStatus);
router.post("/send-reset-reactivate-email", sendResetReactivateEmail);
router.post("/resend-verification-email", reSendVerificationEmail);



router.patch('/update-password', protect, updatePassword);
export default router;