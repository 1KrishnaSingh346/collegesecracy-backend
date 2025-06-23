import { User } from '../models/User.js';
// import {EventCalender} from "../models/EventSchema.js";
// import {EventMark} from "../models/UserEventMarkSchema.js";
import {Feedback} from '../models/FeedBackSchema.js';
import Notification from '../models/Notification.js';
import AppError from '../utils/appError.js';
import cloudinary from '../config/cloudinary.js';
import { Audit } from '../models/Audit.js';




export const getMe = async (req, res, next) => {
  try {
    let query = User.findById(req.user.id)  // ❌ yahan await mat laga
      .select('-password -__v -passwordChangedAt -passwordResetToken -passwordResetExpires');

    // Conditionally populate feedbacks only for mentee
    if (req.user.role === 'mentee') {
      query = query
        .populate('feedbacks')
        .populate('premiumTools.toolId')
        .populate('premiumTools.planId')
        .populate('counselingPlans.planId');
    }

    const user = await query;  // ✅ yahan await laga ab

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err) {
    next(err);
  }
};


export const uploadProfilePic = async (req, res, next) => {
  try {
    const { id } = req.user;

    // ✅ File must be present
    if (!req.file) {
      return next(new AppError('No image file uploaded', 400));
    }

    const filePath = req.file.path;

    // 🧹 Delete old image if present
    const user = await User.findById(id).select('profilePic');
    if (user?.profilePic?.public_id) {
      try {
        await cloudinary.uploader.destroy(user.profilePic.public_id);
      } catch (err) {
        console.warn('Failed to delete old image from Cloudinary:', err.message);
      }
    }

    // 📤 Upload new image from file path
    const uploadResponse = await cloudinary.uploader.upload(filePath, {
      folder: 'profile_pics',
      transformation: [{ width: 300, height: 300, crop: 'fill' }],
    });

    const profilePicData = {
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    };

    await User.findByIdAndUpdate(id, { profilePic: profilePicData }, { new: true });

    res.status(200).json({
      status: 'success',
      data: { profilePic: profilePicData },
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    next(new AppError('Failed to upload image', 500));
  }
};

export const removeProfilePic = async (req, res, next) => {
  try {
    const { id } = req.user;

    const user = await User.findById(id).select('profilePic');
    if (!user) return next(new AppError('User not found', 404));

    if (user.profilePic?.public_id) {
      await cloudinary.uploader.destroy(user.profilePic.public_id);
    }

    user.profilePic = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile picture removed',
    });
  } catch (err) {
    console.error('Remove profile pic error:', err);
    next(new AppError('Failed to remove image', 500));
  }
};



export const updateMe = async (req, res, next) => {
  try {
    const { id } = req.user;
    const allowedFields = ['fullName', 'bio', 'phone', 'location', 'dateOfBirth'];
    const filteredBody = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'dateOfBirth') {
          const dob = req.body[field];
          if (!dob) {
            filteredBody[field] = null;
          } else {
            const parsed = new Date(dob);
            if (isNaN(parsed.getTime()) || parsed > new Date()) {
              return next(new AppError('Invalid dateOfBirth', 400));
            }
            filteredBody[field] = parsed;
          }
        } else {
          filteredBody[field] = typeof req.body[field] === 'string'
            ? req.body[field].trim() || null
            : req.body[field];
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, filteredBody, {
      new: true,
      runValidators: true,
      context: 'query',
      select:
        '-__v -password -passwordChangedAt -passwordResetToken -passwordResetExpires -refreshToken',
    }).lean();

    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          ...updatedUser,
          dateOfBirth: updatedUser.dateOfBirth?.toISOString().split('T')[0] || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};



export const deleteMe = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required to delete your account'
      });
    }

    // 1. Find user and include password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    // 2. Match password using bcrypt
    const isMatch = await user.correctPassword(password);
    if (!isMatch) {
      return res.status(400).json({ status: 'fail', message: 'Incorrect password' });
    }

    // Before deletion
    await Audit.create({
      userId: user._id,
      action: 'Account Deleted',
      reason: 'User requested deletion',
      ip: req.ip,
      email: user.email,
      role: user.role
    });
    // 3. Delete user permanently
    await User.findByIdAndDelete(req.user.id);

    // 4. Clear session cookie (if using cookie-based auth)
    res.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};


export const deactivateAccount = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    await Audit.create({
    userId: user._id,
    action: 'Account Deactivated',
    reason: reason || 'No reason provided',
    ip: req.ip,
    email: user.email,
   role: user.role
    });

    user.active = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || '';
    await user.save();

    res.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({ status: 'success', message: 'Account deactivated' });
  } catch (err) {
    next(err);
  }
};

export const submitFeedBack = async (req, res) => {
    try {
        const { message, category, starRating } = req.body;
        const userId = req.user._id;
        
        const existingFeedback = await Feedback.findOne({ userId });
        
        if (existingFeedback) {
            return res.status(400).json({ 
                error: "You already submitted feedback. Please edit your existing feedback instead." 
            });
        }
        
        const newFeedback = new Feedback({ 
            message, 
            category, 
            starRating,
            userId 
        });
        
        await newFeedback.save();
        
        await User.findByIdAndUpdate(userId, {
            $push: { feedbacks: newFeedback._id }
        });

        // Create notification for admin
        await Notification.create({
            type: 'feedback_submitted',
            message: `New feedback submitted by ${req.user.email}`,
            userId,
            feedbackId: newFeedback._id,
            metadata: {
                feedbackCategory: category,
                rating: starRating
            }
        });
        
        res.status(201).json({ 
            message: "Feedback submitted successfully",
            feedback: newFeedback
        });
    } catch (error) {
        console.error("Error in submitting feedback:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

export const editFeedback = async (req, res) => {
    try {
        const { message, category, starRating } = req.body;
        const feedbackId = req.params.feedbackId;
        const userId = req.user._id;

        const feedback = await Feedback.findOne({
            _id: feedbackId,
            userId: userId
        });

        if (!feedback) {
            return res.status(404).json({ 
                error: "Feedback not found or you don't have permission to edit it" 
            });
        }

        // Store previous values for notification
        const previousValues = {
            message: feedback.message,
            category: feedback.category,
            starRating: feedback.starRating,
            status: feedback.status
        };

        feedback.message = message || feedback.message;
        feedback.category = category || feedback.category;
        feedback.starRating = starRating || feedback.starRating;
        feedback.status = 'pending';
        feedback.updatedAt = new Date();
        
        await feedback.save();

        await Notification.create({
            type: 'feedback_updated',
            message: `Feedback updated by ${req.user.email} (${req.user.fullName})`,
            userId,
            feedbackId: feedback._id,
            metadata: {
                previousValues,
                newValues: {
                    message,
                    category,
                    starRating
                },
                changedFields: Object.keys(req.body),
                userDetails: {
                    email: req.user.email,
                    fullName: req.user.fullName,
                    userId: req.user._id
                }
            }
        });

        res.status(200).json({ 
            message: "Feedback updated successfully and submitted for admin review",
            feedback
        });
    } catch (error) {
        console.error("Error in editing feedback:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

export const getFeedbacks = async (req, res) => {
    try {
        const userId = req.user?._id;
        console.log("USer id", userId);
        const feedbacks = await Feedback.find({ userId })
            .sort({ createdAt: -1 })
             .lean();
            // .limit(5);
            //  .lean();
            
        res.status(200).json(feedbacks);
    } catch (error) {
        console.error("Error fetching feedbacks:", error);
        res.status(500).json({ error: "Server Error" });
    }
};



// Get approved feedbacks for public display
export const getApprovedFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(12) // Limit to 12 testimonials max
      .populate({
        path: 'user',
        select: 'fullName profilePic role'
      });

    const response = feedbacks.map(feedback => ({
      id: feedback._id,
      name: feedback.anonymous ? 'Anonymous' : feedback.user.fullName,
      profilePic: feedback.anonymous ? null : feedback.user.profilePic,
      role: feedback.anonymous ? null : feedback.user.role,
      message: feedback.message,
      rating: feedback.starRating,
      category: feedback.category,
      date: feedback.createdAt,
      anonymous: feedback.anonymous
    }));

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch testimonials'
    });
  }
};


//Event Controller Fucntions
// getting all the events

export const GetAllEvents = async(req,res)=>{
try {
    const events = await EventCalender.find().sort({date:1});
    res.json(events)
} catch (err) {
    throw new Error(err.response?.data?.message ||"Failed to Fetch the events");
}
};
// marking the events 

export const MarkEvents = async (req, res) => {
  try {
    const alreadyMarked = await EventMark.findOne({
      userId: req.user.id,
      eventId: req.params.id
    });

    if (alreadyMarked) {
      return res.status(400).json({ message: "Already marked" });
    }

    const markNew = new EventMark({
      userId: req.user.id,
      eventId: req.params.id
    });

    await markNew.save();

    res.status(201).json({ message: "Event marked successfully" });
  } catch (err) {
    console.error("Mark event error:", err);
    res.status(500).json({ message: "Failed to mark the event" });
  }
};




