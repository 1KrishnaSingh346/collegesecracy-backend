import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import getAllUsers from "../controllers/adminController.js";

const router = express.Router();

// All routes in this file are protected and admin-only
router.use(protect, restrictTo('admin'));


router.get('/users', getAllUsers);

export default router;