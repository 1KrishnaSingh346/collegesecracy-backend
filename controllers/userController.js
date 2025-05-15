import { User } from '../models/User.js';
import AppError from '../utils/appError.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
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


export const updateMe = async (req, res) => {
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
                return res.status(400).json({
                  status: 'fail',
                  message: 'Invalid date format for dateOfBirth (expected YYYY-MM-DD)'
                });
              }
              
              if (parsedDate > new Date()) {
                return res.status(400).json({
                  status: 'fail',
                  message: 'Date of birth cannot be in the future'
                });
              }
              
              filteredBody[field] = parsedDate;
            } catch (err) {
              return res.status(400).json({
                status: 'fail',
                message: 'Invalid date format for dateOfBirth'
              });
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
            return res.status(400).json({
              status: 'fail',
              message: 'Profile picture must be less than 5MB'
            });
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
              setTimeout(() => reject(new Error('Cloudinary upload timed out')), 15000)
          )]);

          filteredBody.profilePic = {
            url: uploadResponse.secure_url,
            public_id: uploadResponse.public_id
          };
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(400).json({
          status: 'fail',
          message: uploadError.message.includes('timed out') 
            ? 'Image upload took too long. Please try a smaller file.' 
            : 'Failed to process profile picture'
        });
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
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Format response data
    const responseData = {
      ...updatedUser,
      dateOfBirth: updatedUser.dateOfBirth?.toISOString()?.split('T')[0] || null, // Return only date part
      profilePic: updatedUser.profilePic?.url || null
    };

    return res.status(200).json({
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
      
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate field errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return res.status(409).json({
        status: 'fail',
        message: `${field} already exists`,
        field
      });
    }

    // Handle unexpected errors
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};