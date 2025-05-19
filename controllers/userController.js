import { User } from '../models/User.js';
import AppError from '../utils/appError.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';



export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v -passwordChangedAt -passwordResetToken -passwordResetExpires');
    
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

export const updateMe = async (req, res, next) => {
  try {
    const { id } = req.user;
    const filteredBody = {};
    const allowedFields = [
      'fullName', 
      'bio',
      'phone',
      'location',
      'dateOfBirth'
    ];

    // Validate and filter allowed fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'dateOfBirth') {
          // Handle dateOfBirth field specifically
          if (req.body[field] === null || req.body[field] === '') {
            filteredBody[field] = null;
          } else {
            try {
              const dateValue = req.body[field];
              const parsedDate = new Date(dateValue);
              
              if (isNaN(parsedDate.getTime())) {
                return next(new AppError('Invalid date format for dateOfBirth (expected YYYY-MM-DD)', 400));
              }
              
              if (parsedDate > new Date()) {
                return next(new AppError('Date of birth cannot be in the future', 400));
              }
              
              filteredBody[field] = parsedDate;
            } catch (err) {
              return next(new AppError('Invalid date format for dateOfBirth', 400));
            }
          }
        } else {
          // Trim string fields and set null if empty
          filteredBody[field] = typeof req.body[field] === 'string' 
            ? req.body[field].trim() || null 
            : req.body[field];
        }
      }
    }

    // Handle profile picture upload
    if (req.body.profilePic !== undefined) {
      try {
        const oldUser = await User.findById(id).select('profilePic');
        
        // Remove old image if exists and we're changing the picture
        if (oldUser?.profilePic?.public_id && req.body.profilePic !== oldUser.profilePic.url) {
          await cloudinary.uploader.destroy(oldUser.profilePic.public_id)
            .catch(error => console.error('Error deleting old image:', error));
        }

        // Handle profile picture removal
        if (req.body.profilePic === '' || req.body.profilePic === null) {
          filteredBody.profilePic = null;
        } 
        // Handle new image upload
        else if (req.body.profilePic && req.body.profilePic.startsWith('data:image')) {
          // Validate image size (max 5MB)
          const fileSize = Buffer.byteLength(req.body.profilePic) / (1024 * 1024);
          if (fileSize > 5) {
            return next(new AppError('Profile picture must be less than 5MB', 400));
          }

          // Upload with timeout protection
          const uploadResponse = await Promise.race([
            cloudinary.uploader.upload(req.body.profilePic, {
              folder: 'mentor-meet/profiles',
              width: 500,
              height: 500,
              crop: 'fill',
              quality: 'auto:good',
              format: 'webp',
              invalidate: true
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new AppError('Image upload took too long. Please try a smaller file.', 400)), 15000)
          )]);

          filteredBody.profilePic = {
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id
          };
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return next(new AppError(
          uploadError.message.includes('timed out') 
            ? 'Image upload took too long. Please try a smaller file.' 
            : 'Failed to process profile picture',
          400
        ));
      }
    }

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(
      id,
      filteredBody,
      {
        new: true,
        runValidators: true,
        context: 'query',
        select: '-__v -password -passwordChangedAt -passwordResetToken -passwordResetExpires -refreshToken'
      }
    ).lean();

    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }

    // Format response data
    const responseData = {
      ...updatedUser,
      dateOfBirth: updatedUser.dateOfBirth?.toISOString()?.split('T')[0] || null,
      profilePic: updatedUser.profilePic?.url || null
    };

    res.status(200).json({
      status: 'success',
      data: {
        user: responseData
      }
    });

  } catch (err) {
    console.error('UpdateMe error:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => ({
        field: el.path,
        message: el.message
      }));
      
      return next(new AppError('Validation failed', 400, errors));
    }

    // Handle duplicate field errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new AppError(`${field} already exists`, 409, { field }));
    }

    next(err);
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { active: false });
    
    // Clear session cookie
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