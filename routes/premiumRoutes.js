import express from 'express';
import { protect, checkPremium } from '../middlewares/auth.js';
import { getPremiumContent } from '../controllers/premiumController.js';

const router = express.Router();

// All routes in this file are protected
router.use(protect);

// Premium content route
router.get('/premium-content', checkPremium, getPremiumContent);

export default router;