import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Sends an email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message content
 * @returns {Promise<void>}
 */
export const sendEmail = async ({ email, subject, message }) => {
  try {
    const mailOptions = {
      from: `"CollegeSecracy" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      text: message,
      // html: `<b>${message}</b>` // You can add HTML version if needed
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error('Error sending email:', err);
    throw new Error('There was an error sending the email. Try again later!');
  }
};

/**
 * Sends a verification email
 * @param {Object} user - User object
 * @param {string} verificationToken - Verification token
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const message = `Hi ${user.fullName},\n\nPlease verify your email by clicking on this link: ${verificationUrl}\n\nIf you didn't create an account, please ignore this email.`;

  await sendEmail({
    email: user.email,
    subject: 'Verify your email address',
    message
  });
};

/**
 * Sends a password reset email
 * @param {Object} user - User object
 * @param {string} resetToken - Password reset token
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const message = `Hi ${user.fullName},\n\nYou requested a password reset. Click this link to set a new password: ${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request a password reset, please ignore this email.`;

  await sendEmail({
    email: user.email,
    subject: 'Your password reset token (valid for 10 min)',
    message
  });
};

export default {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};