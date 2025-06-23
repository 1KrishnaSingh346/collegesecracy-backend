import express from 'express';
import { protect } from '../middlewares/auth.js';
import upload from '../utils/multer.js';
import {
  getMe,
  updateMe,
  deleteMe,
  deactivateAccount,
  uploadProfilePic,
  removeProfilePic
} from '../controllers/userController.js';

import {
  getMyAuditLogs
} from "../controllers/auditController.js";

const router = express.Router();

// 🔐 Apply auth to all routes
router.use(protect);

// 📄 User Profile Routes
router.get('/me', getMe);
router.patch('/updateMe', updateMe);
router.post('/uploadProfilePic', upload.single('profilePic'), uploadProfilePic);
router.delete('/removeProfilePic', removeProfilePic);

// ⚠️ Account Actions
router.patch('/deactivateAccount', deactivateAccount);  // soft delete (set active: false)
router.delete('/deleteAccount', deleteMe);              // hard delete (requires password)

// audit Logs
router.get("/audit/my-logs",  getMyAuditLogs);

export default router;
