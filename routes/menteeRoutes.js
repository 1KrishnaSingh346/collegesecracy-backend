import express from 'express';
import { protect } from '../middlewares/auth.js';
import { validateCollegeDataParams } from '../middlewares/ValidateCollegeData.js';
import { getCollegeDataByTypeAndRound } from '../controllers/adminController.js';

const router = express.Router();

router.use(protect); // mentee-authenticated routes

router.route('/get-college-data/:type/:year/:round')
  .get(validateCollegeDataParams, getCollegeDataByTypeAndRound);

router.route('/get-college-data/:type/:round')
  .get(validateCollegeDataParams, getCollegeDataByTypeAndRound);

export default router;
