import express from 'express';
import { protect } from '../middlewares/auth.js';
import { validateCollegeDataParams } from '../middlewares/ValidateCollegeData.js';
import { getCollegeDataByTypeAndRound } from '../controllers/adminController.js';

import {
  submitFeedBack,
  editFeedback,
  getFeedbacks,
} from '../controllers/userController.js';

import { GetPlan } from "../controllers/planController.js";
import {
  GetAllEvents,
  GetSingleEvent,
  MarkEvent,
  UnmarkEvent,
  GetMarkedEvents,
  // RegisterForEvent,
  // UnregisterFromEvent,
  // GetRegisteredEvents
} from "../controllers/eventController.js";

const router = express.Router();

//router.use(protect); // mentee-authenticated routes. // In emergency we are doing this

// Event Routes
router.route('/events')
  .get(GetAllEvents); // Get all events

router.route('/events/:eventId')
  .get(GetSingleEvent); // Get single event details

// router.route('/events/register/:eventId')
//   .post(RegisterForEvent); // Register for an event

// router.route('/events/unregister/:eventId')
//   .delete(UnregisterFromEvent); // Unregister from an event

// router.route('/events/registered')
//   .get(GetRegisteredEvents); // Get all registered events

router.route('/events/mark/:eventId')
  .post(MarkEvent); // Mark an event as interested

router.route('/events/unmark/:eventId')
  .delete(UnmarkEvent); // Remove interest from an event

router.route('/events/marked')
  .get(GetMarkedEvents); // Get all marked/interested events

// Feedback Routes
router.route('/feedback')
  .post(submitFeedBack); // Submit new feedback

router.route('/feedbackHistory')
  .get(getFeedbacks); // Get feedback history

router.route('/editFeedback/:feedbackId')
  .patch(editFeedback); // Edit existing feedback

// Plan Routes
router.route('/plans/:Plantype') 
  .get(GetPlan); // Get plans by type

router.route('/plans') 
  .get(GetPlan); // Get all plans

// CollegeData Routes
router.route('/get-college-data/:type/:year/:round')
  .get(validateCollegeDataParams, getCollegeDataByTypeAndRound);

router.route('/get-college-data/:type/:round')
  .get(validateCollegeDataParams, getCollegeDataByTypeAndRound);

export default router;