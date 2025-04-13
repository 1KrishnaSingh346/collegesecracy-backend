import express from 'express';
import { protect } from '../middlewares/auth.js';
import { getMe, updateMe, deleteMe } from '../controllers/userController.js';
import { uploadSingle } from '../utils/multer.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.patch('/updateMe', uploadSingle('profilePic'), updateMe);
router.delete('/deleteMe', deleteMe);

export default router;