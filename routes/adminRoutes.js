import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import { adminAction } from '../controllers/adminController.js';

const router = express.Router();

// All routes in this file are protected and admin-only
router.use(protect, restrictTo('admin'));

// Admin action route
router.post('/admin', adminAction);

export default router;