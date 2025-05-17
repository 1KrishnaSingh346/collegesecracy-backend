import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import multer from 'multer';
import {
  getAllUsers,
  getAllCollegeData,
  uploadCollegeData,
  updateCollegeData,
  deleteCollegeData
} from '../controllers/adminController.js';

const router = express.Router();
const upload = multer();

router.use(protect, restrictTo('admin')); // admin-only routes

router.route('/users').get(getAllUsers);

router.route('/college-data').get(getAllCollegeData);

router.route('/college-data/upload')
  .post(upload.single('file'), uploadCollegeData);

router.route('/college-data/:id')
  .patch(updateCollegeData)
  .delete(deleteCollegeData);

export default router;
