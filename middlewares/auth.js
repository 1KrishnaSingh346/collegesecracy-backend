import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import AppError from '../utils/appError.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const protect = async (req, res, next) => {
  try {
    console.log("TOken check started ");
    // 1) Get token from cookies or Authorization header
    let token;
    if (req.cookies?.jwt) {
      token = req.cookies.jwt;
      console.log("Token in browser : ", token);
    } else if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // return next(new AppError('Not authorized, no token provided', 401));
      if (!token) {
        return res.status(401).json({ message: "Invalid Token!" });
        }

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

export const checkIfLocked = async (req, res, next) => {
  try {
    const email = req.body.email?.trim();
    if (!email) return next();

    const user = await User.findActiveOne({ email });

    if (user?.lockUntil && user.lockUntil < Date.now()) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    next();
  } catch (err) {
    console.error("Error in checkIfLocked middleware:", err.message);
    next(); // Don't block login due to middleware crash
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing. Please login again." });
    }

    // ✅ Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token. Please login again." });
    }

    // ✅ Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found. Please login again." });
    }

    // ✅ Generate new access token
    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    const isProd = process.env.NODE_ENV === 'production';

    // ✅ Send new access token in cookie
    res.cookie('jwt', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'Strict' : 'Lax',
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    });

  } catch (err) {
    console.error("Refresh token error:", err.message);
    res.status(500).json({ message: "Something went wrong. Please try again later." });
  }
};