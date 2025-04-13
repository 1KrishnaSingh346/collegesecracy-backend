import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import AppError from '../utils/appError.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const protect = async (req, res, next) => {
  try {
    // 1) Get token from cookies or Authorization header
    let token;
    if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    } else if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized, no token provided', 401));
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    // 4) Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError('Password changed recently! Please log in again', 401)
      );
    }

    // 5) Grant access to protected route
    req.user = user;
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

/**
 * Middleware to check if user has premium access
 */
export const checkPremium = (req, res, next) => {
  if (!req.user.premium) {
    return next(
      new AppError('Please upgrade to premium to access this feature', 402)
    );
  }
  next();
};

/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles
 */
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

/**
 * Middleware to check if mentor is verified
 */
export const checkVerified = (req, res, next) => {
  if (req.user.role === 'mentor' && req.user.verificationStatus !== 'verified') {
    return next(
      new AppError('Please complete verification to access this feature', 403)
    );
  }
  next();
};