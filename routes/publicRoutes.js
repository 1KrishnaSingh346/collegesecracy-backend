import express from 'express';
import { getApprovedFeedbacks } from '../controllers/userController.js'

const router = express.Router();

router.route("/feedback").get(getApprovedFeedbacks);

export default router;