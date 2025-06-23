import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.js';
import multer from 'multer';

import {
  getAllUsers,
  getAllCollegeData,
  uploadCollegeData,
  updateCollegeData,
  deleteCollegeData,
  getAllFeedbacks,
  updateFeedbackStatus,
  getNotifications,
  markAsRead
} from '../controllers/adminController.js';

import {
  CreateEvent,
  UpdateEvent,
  DeleteEvent,
  GetAllEvents,
  GetSingleEvent,
  GetEventAttendees,
} from "../controllers/eventController.js";

import {
  getAllAuditLogs
} from "../controllers/auditController.js";

import {
  AddPlan,
  GetPlan,
  UpdatePlans,
  DeletePlan
} from '../controllers/planController.js';

import {
  getAllPayments
} from "../controllers/paymentController.js";

const router = express.Router();
const upload = multer();

router.use(protect, restrictTo('admin')); // admin-only routes

// Feedback routes
router.route('/feedback')
  .get(getAllFeedbacks);

router.route('/feedback/:id')
  .patch(updateFeedbackStatus);

// User routes
router.route('/users')
  .get(getAllUsers);

// College Data routes
router.route('/college-data')
  .get(getAllCollegeData);

router.route('/college-data/upload')
  .post(upload.single('file'), uploadCollegeData);

router.route('/college-data/:id')
  .patch(updateCollegeData)
  .delete(deleteCollegeData);

// Event routes
router.route('/events')
  .post(CreateEvent)       // Create new event
  .get(GetAllEvents);      // Get all events

router.route('/events/:eventId')
  .get(GetSingleEvent)     // Get single event
  .patch(UpdateEvent)      // Update event
  .delete(DeleteEvent);    // Delete event

router.route('/events/:eventId/attendees')
  .get(GetEventAttendees); // Get event attendees

// Notification routes
router.route('/notifications')
  .get(getNotifications);
router.route('/notifications/:id/read')
  .patch(markAsRead);

// Plan Management routes
router.route('/plans')
  .post(AddPlan) // create plan
  .get(GetPlan);

router.route('/plans/:Plantype') 
  .get(GetPlan);

router.route('/plans/update/:id')
  .patch(UpdatePlans); // update plan by ID

router.route('/plans/delete/:id')
  .delete(DeletePlan); // delete plan by ID

// get all payment details
router.route('/payments')
      .get(getAllPayments);

// get all audit route
router.route("/audit/all")
      .get(getAllAuditLogs);


export default router;