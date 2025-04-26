import express from 'express';
import { protect } from '../middlewares/auth.js';
import { 
  getMe, 
  updateMe, 
  deleteMe,
} from '../controllers/userController.js';
import { uploadSingle } from '../utils/multer.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Basic user profile routes
router.get('/me', getMe);
router.patch('/updateMe', uploadSingle('profilePic'), updateMe);
router.delete('/deleteMe', deleteMe);

// Feedback routes
// router.post('/feedback', submitFeedback);
// router.get('/feedback-history', getFeedbackHistory);
// router.get('/feedback-stats', getFeedbackStats);

export default router;