import express from 'express';
import { protect, checkVerified } from '../middlewares/auth.js';
import { mentorTools } from '../controllers/mentorController.js';

const router = express.Router();

// All routes in this file are protected
router.use(protect);

// Mentor tools route (only for verified mentors)
router.get('/mentor-tools', checkVerified, mentorTools);

export default router;