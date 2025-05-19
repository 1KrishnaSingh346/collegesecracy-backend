import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import AppError from '../utils/appError.js';
import { createSendToken } from "../utils/authUtils.js";

// Session Management
export const checkSession = async (req, res, next) => {
  try {
    // If execution reaches here, the auth middleware has already verified the session
    const user = await User.findById(req.user.id).select('-password -__v -passwordChangedAt');
    
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'User not found'
      });
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

export const signup = async (req, res, next) => {
  try {
    console.log('Received signup request:', req.body);
    
    const { email, password, fullName, role } = req.body;
    
    // Validate required fields
    if (!email || !password || !fullName || !role) {
      console.log('Missing fields in signup request');
      return next(new AppError('Please provide all required fields', 400));
    }

      // Check if user already exists
    const existingUser = await User.findOne({ email });
if (existingUser) {
  console.log('Email already registered:', email);
  return res.status(409).json({
    status: 'fail',
    message: 'Email already registered. Please log in.',
    errors: [{ path: 'email', msg: 'Email already registered' }]
  });
}

    // Create new user
    const newUser = await User.create({
      email,
      password,
      fullName,
      role
    });

    console.log('User created successfully:', newUser.email); // Debug log

    // Generate token directly without email
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    // Simplified response
    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role
        }
      }
    });

  } catch (err) {
    console.error('Signup error:', err); // Detailed error log
    
    if (err.code === 11000) {
      return next(new AppError('Email already exists', 409));
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return next(new AppError(messages.join('. '), 400));
    }
    
    // Handle unexpected errors
    next(new AppError('Signup process failed', 500));
  }
};

export const login = async (req, res, next) => {
  try {
    // 1) Validate request body structure
    if (!req.body || typeof req.body !== 'object') {
      return next(new AppError('Invalid request format', 400));
    }

    const { email, password } = req.body;

    // 2) Check for missing credentials
    if (!email?.trim() || !password) {
      return next(new AppError('Please provide both email and password', 400));
    }

    // 3) Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    // 4) Find user with password and active status
    const user = await User.findOne({ email: email.trim() })
      .select('+password +active +loginAttempts +lockUntil');
    
    // 5) Check account existence and status
    if (!user) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // 6) Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return next(new AppError(
        `Account temporarily locked. Try again in ${remainingTime} minute(s)`, 
        403
      ));
    }

    // 7) Verify password
    const isCorrectPassword = await user.correctPassword(password, user.password);
    
    // 8) Handle failed attempts
    if (!isCorrectPassword) {
      user.loginAttempts += 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await user.save({ validateBeforeSave: false });
        return next(new AppError(
          'Too many failed attempts. Account locked for 30 minutes',
          403
        ));
      }
      
      await user.save({ validateBeforeSave: false });
      return next(new AppError('Incorrect email or password', 401));
    }

    // 9) Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    // 10) Remove sensitive data before sending token
    user.password = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;

    // 11) Send token using your existing function
    createSendToken(user, 200, res);

  } catch (err) {
    // 12) Handle unexpected errors
    console.error(`Login error for ${req.body?.email}:`, err);
    next(new AppError('An error occurred during login', 500));
  }
};

// authController.js
export const logout = (req, res) => {
  try {
    console.log('Logout request received from:', req.user?.email);
    
    // Clear the JWT cookie
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 1000), // Expires in 1 second
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Optional: Add Cache-Control headers
    res.set('Cache-Control', 'no-store, must-revalidate');

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out'
    });

  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
};

// Protect middleware for authenticated routes
export const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verification token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('User recently changed password! Please log in again.', 401)
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (err) {
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again!', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired! Please log in again.', 401));
    }
    next(err);
  }
};

// Restrict middleware for role-based access
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// Forgot password controller
export const forgotPassword = async (req, res, next) => {
  try {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with that email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email (removed actual email sending)
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;

    // In production, you would send an email here
    console.log(`Password reset token: ${resetToken}`);
    console.log(`Reset URL: ${resetURL}`);

    res.status(200).json({
      status: 'success',
      message: 'Token generated (in production this would be sent via email)',
      token: resetToken // Only for development/testing
    });
  } catch (err) {
    next(err);
  }
};

// Reset password controller
export const resetPassword = async (req, res, next) => {
  try {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Log the user in, send JWT
    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// Update password controller
export const updatePassword = async (req, res, next) => {
  try {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};