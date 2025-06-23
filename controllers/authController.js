import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import AppError from '../utils/appError.js';
import { createSendToken } from "../utils/authUtils.js";
import Notification from '../models/Notification.js';
import sendVerificationEmail from '../utils/sendVerificationEmail.js';
import { Audit } from '../models/Audit.js';

const MAX_RESENDS = 5;
const RESEND_WINDOW = 30 * 60 * 1000; // 30 minutes in ms

// ✅ Check Session
export const checkSession = async (req, res) => {
  try {
    console.log("Auth check hit ");

    // ✅ Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        code: 401,
        status: 'fail',
        message: 'Unauthorized - User not authenticated',
      });
    }

    const user = await User.findById(req.user.id)
      .select('-password -__v -passwordChangedAt -passwordResetToken -passwordResetExpires')
      .lean();

    if (!user) {
      return res.status(401).json({
        code: 401,
        status: 'fail',
        message: 'User not found',
      });
    }

    res.status(200).json({
      code: 200,
      status: 'success',
      data: { user },
    });
  } catch (err) {
    console.error('Error in checkSession:', err);
    res.status(500).json({
      code: 500,
      status: 'error',
      message: 'Internal Server Error',
    });
  }
};


// ✅ Signup
export const signup = async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return next(new AppError('Please provide all required fields', 400));
    }

    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email already registered. Please log in.',
        errors: [{ path: 'email', msg: 'Email already registered' }],
      });
    }

    // generate verification token

const verificationToken = crypto.randomBytes(32).toString('hex');
console.log("generated token", verificationToken);
const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
console.log("hased token ; ", hashedToken);

const newUser = await User.create({
  email: email.trim(),
  password,
  fullName,
  role,
  isVerified: false,
  verificationToken: hashedToken, // ✅ hashed token saved here
  verificationTokenExpiry:  Date.now() + 10 * 60 * 1000 // ✅ expires in 10 min
});


    await Notification.create({
      type: 'user_registered',
      message: `New ${role} registered: ${fullName} (${email})`,
      userId: newUser._id,
      isRead: false,
      metadata: {
        userRole: role,
        registrationDate: new Date(),
      },
    });

    // send verification email
    await sendVerificationEmail(email, verificationToken, "verify"); // your custom function

    return res.status(200).json({
      status: 'success',
      message: 'Signup successful! Please verify your email address before logging in.',
    });
  } catch (err) {
    console.error('Signup error:', err);

    if (err.code === 11000) return next(new AppError('Email already exists', 409));
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return next(new AppError(messages.join('. '), 400));
    }

    next(new AppError('Signup process failed', 500));
  }
};

// ✅ Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email?.trim()) return res.status(400).json({ status: 'fail', message: 'Please provide your email address' });
    if (!password) return res.status(400).json({ status: 'fail', message: 'Please provide your password' });

    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email: emailTrimmed })
      .select('+password +loginAttempts +lockUntil +deactivatedAt +deactivationReason +active');

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'The email address you entered is not registered.',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        status: 'fail',
        code : 'VERIFY_ACCOUNT',
        message: 'Please verify your email before logging in.',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        status: 'fail',
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account is deactivated. Please reactivate your account to login.',
        deactivatedAt: user.deactivatedAt,
        deactivationReason: user.deactivationReason || '',
      });
    }

    // Lock check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({
        status: 'fail',
        locked : true,
        lockTimeLeft : minutes,
        message: `Account temporarily locked. Try again in ${minutes} minute(s).`,
      });
    }

    // Password validation
    const isCorrectPassword = await user.correctPassword(password, user.password);
    if (!isCorrectPassword) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // lock for 30 minutes
        await user.save({ validateBeforeSave: false });
        return res.status(403).json({
          status: 'fail',
          message: 'Too many failed attempts. Account locked for 30 minutes.',
        });
      }

      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        status: 'fail',
        message: 'The password you entered is incorrect.',
      });
    }

    // Reset login attempts if password is correct
    if (user.loginAttempts > 0 || user.lockUntil || user.resendCount) {
      user.loginAttempts = 0;
      user.resendCount = 0;
      user.lockUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    // ✅ Issue JWT token
    createSendToken(user, 200, res);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred during login. Please try again.',
    });
  }
};


export const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { email, password } = req.body;

  if (!token || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing token, email, or password.",
    });
  }

  try {
    const user = await User.findOne({ email }).select(
      "+password +active +passwordResetToken +passwordResetExpires"
    );

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with provided email.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Reactivate to reset password.",
      });
    }

    if (
      user.passwordResetToken !== hashedToken ||
      user.passwordResetExpires < Date.now()
    ) {
      await Audit.create({
        userId: user._id,
        action: "password_reset_attempt",
        reason: "invalid_or_expired_token",
        ip: ipAddress,
        deviceInfo: userAgent,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      });
    }

    // 🔒 Check if new password is same as old one
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as the old one. Try something different.",
      });
    }

    // ✅ Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();

    await user.save();

    await Audit.create({
      userId: user._id,
      action: "password_reset",
      reason: "success",
      ip: ipAddress,
      deviceInfo: userAgent,
    });

    return res.status(200).json({
      success: true,
      message: "✅ Password has been reset successfully. You can now log in.",
    });

  } catch (err) {
    console.error("❌ Password reset error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during password reset.",
    });
  }
};


export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  const { email, type } = req.body;
  const validTypes = ["verify", "reactivation", "reset"]; // ✅ Added "reset"

  // Validate early
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid request type." });
  }

  if (!token || !email) {
    return res.status(400).json({ success: false, message: "Token or email missing." });
  }

  try {
    const user = await User.findOne({ email }).select("+active");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with provided email." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.connection?.remoteAddress || "";

    // RESET TYPE: check against passwordResetToken
if (type === "reset") {
  if (
    user.passwordResetToken !== hashedToken ||
    user.passwordResetExpires < Date.now()
  ) {
    await Audit.create({
      userId: user._id,
      action: "password_reset_token_attempt",
      reason: "invalid_or_expired_token",
      ip: ipAddress,
      deviceInfo: userAgent,
    });

    return res.status(400).json({ success: false, message: "Invalid or expired reset link." });
  }

  await Audit.create({
    userId: user._id,
    action: "password_reset_token_verified",
    reason: "success",
    ip: ipAddress,
    deviceInfo: userAgent,
  });

  return res.status(200).json({ success: true, message: "Valid reset link." });
}


    // Already active or verified cases
    if (type === "reactivation" && user.active) {
      await Audit.create({
        userId: user._id,
        action: "email_reactivation_attempt",
        reason: "already_active",
        ip: ipAddress,
        deviceInfo: userAgent,
      });

      return res.status(400).json({ success: false, message: "Account is already active." });
    }

    if (type === "verify" && user.isVerified) {
      await Audit.create({
        userId: user._id,
        action: "email_verification_attempt",
        reason: "already_verified",
        ip: ipAddress,
        deviceInfo: userAgent,
      });

      return res.status(200).json({
        success: false,
        alreadyVerified: true,
        message: "Email is already verified.",
      });
    }

    // Token mismatch or expired
    if (
      user.verificationToken !== hashedToken ||
      user.verificationTokenExpiry < Date.now()
    ) {
      await Audit.create({
        userId: user._id,
        action: type === "verify" ? "email_verification_attempt" : "account_reactivation_attempt",
        reason: "invalid_or_expired_token",
        ip: ipAddress,
        deviceInfo: userAgent,
      });

      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }

    // Success verification / activation
    if (type === "verify") {
      user.isVerified = true;
    } else if (type === "reactivation") {
      user.active = true;
      user.ReactivatedAt = Date.now();
    }

    // Clear verification token
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;

    await user.save({ validateBeforeSave: false });

    await Audit.create({
      userId: user._id,
      action: type === "verify" ? "email_verification" : "account_reactivation",
      reason: "success",
      ip: ipAddress,
      deviceInfo: userAgent,
    });

    return res.status(200).json({
      success: true,
      message:
        type === "verify"
          ? "Email verified successfully. You can now login."
          : "Account activated successfully. You can now login.",
    });

  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during verification.",
    });
  }
};


export const sendResetReactivateEmail = async (req, res) => {
  const { email, type } = req.body;

  const validTypes = ["reset", "reactivation"];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid request type." });
  }

  try {
    const user = await User.findOne({ email }).select("+active");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "This email is not registered with us.",
      });
    }

    if (type === "reset" && !user.active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please reactivate first.",
      });
    }

    if (type === "reactivation" && user.active) {
      return res.status(400).json({
        success: false,
        message: "Account is already active.",
      });
    }

    // ✅ Define token once
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
    const now = Date.now();

    // 🔄 Common logic
    if (type === "reset") {
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = now + 10 * 60 * 1000;
    } else {
      user.verificationToken = hashedToken;
      user.verificationTokenExpiry = now + 10 * 60 * 1000;
    }

    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(email, verificationToken, type);

    res.status(200).json({
      success: true,
      message: `${type === "reactivation" ? "Reactivation" : "Reset password"} link sent successfully.`,
    });

  } catch (err) {
    console.error("Error sending Reactivation/Reset email:", err);
    res.status(500).json({
      success: false,
      message: "Sending Reactivation/Reset link failed.",
    });
  }
};


export const reSendVerificationEmail = async (req, res) => {
  const { email, type } = req.body;
  const validTypes = ["reset", "reactivation", "verify"];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid request type." });
  }

  try {
    const user = await User.findOne({ email }).select("+active");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email.",
      });
    }

    if (type === "verify" && user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified.",
      });
    }

    if (type === "reactivation" && user.active) {
      return res.status(400).json({
        success: false,
        message: "Account is already active.",
      });
    }

    if (type === "reset" && !user.active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please reactivate first.",
      });
    }

    // Rate limiting
    const now = Date.now();
    const last = user.lastResendAt ? new Date(user.lastResendAt).getTime() : 0;

    if (now - last > RESEND_WINDOW) {
      user.resendCount = 0;
    }

    if (user.resendCount >= MAX_RESENDS) {
      const retryAfter = Math.ceil((RESEND_WINDOW - (now - last)) / (60 * 1000));
      return res.status(429).json({
        success: false,
        message: `Resend limit exceeded. Try again in ${retryAfter} minutes.`,
      });
    }

    // ✅ Move declaration outside
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

    // Store based on type
    if (type === "reset") {
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = now + 10 * 60 * 1000; // 10 mins
    } else {
      user.verificationToken = hashedToken;
      user.verificationTokenExpiry = now + 10 * 60 * 1000;
    }

    user.resendCount = (user.resendCount || 0) + 1;
    user.lastResendAt = new Date();

    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(email, verificationToken, type);

    // Audit log
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = req.ip || req.connection?.remoteAddress || "";

    await Audit.create({
      userId: user._id,
      action: `resend_${type}_email`,
      reason: `User requested to resend ${type} email`,
      ip: ipAddress,
      deviceInfo: userAgent,
    });

    const messageMap = {
      verify: "Verification link resent successfully.",
      reset: "Password reset link resent successfully.",
      reactivation: "Reactivation link resent successfully.",
    };

    res.status(200).json({
      success: true,
      message: messageMap[type] || "Link resent successfully.",
    });

  } catch (err) {
    console.error("Error resending email:", err);
    res.status(500).json({
      success: false,
      message: "Resending email failed.",
    });
  }
};



export const checkVerificationStatus = async (req, res, next) => {
  const { email, type } = req.body;
  const validTypes = ["reset", "reactivation", "verify"];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid request type." });
  }
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const user = await User.findOne({ email }).select("+active");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if(type === "reset")
  {
        return res.status(200).json({
        success: true,
        isPasswordChanged: !!user.passwordChangedAt
        });

  }
  else if(type === "reactivation")
    {
          return res.status(200).json({
            success: true,
            isReactivated: user.active
        });
    }
    else
    {
          return res.status(200).json({
          success: true,
          isVerified: user.isVerified
          });
    }


};


// ✅ Logout
export const logout = (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';

    // 🔥 Clear Access Token
    res.cookie('jwt', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'Strict' : 'Lax',
      expires: new Date(0),
      maxAge: 0,
    });

    // 🔥 Clear Refresh Token
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'Strict' : 'Lax',
      expires: new Date(0),
      maxAge: 0,
    });

    res.set('Cache-Control', 'no-store, must-revalidate');

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out',
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error during logout',
    });
  }
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