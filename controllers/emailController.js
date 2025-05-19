import nodemailer from 'nodemailer';
import AppError from '../utils/appError.js';

const sendEmail = async (req, res, next) => {
  try {
    const { name, email, message, queryType } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return next(new AppError('Name, email, and message are required', 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.TEAM_EMAIL) {
      return next(new AppError('Email service is not properly configured', 500));
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service:process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection first
    try {
      await transporter.verify();
      console.log('Server is ready to take our messages');
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      throw new AppError('Could not verify email server connection', 500);
    }

    // 1. Send confirmation to user
    const userMailOptions = {
      from: `"CollegeSecracy Support" <${process.env.EMAIL_USER}>`,
      to: email, // User's email from form
      subject: 'Thank you for contacting CollegeSecracy',
      html: `
        <h2>Hello ${name},</h2>
        <p>We've received your message and will get back to you soon.</p>
        <p><strong>Your Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p>Best regards,<br>The CollegeSecracy Team</p>
      `
    };

    // 2. Send notification to team
    const teamMailOptions = {
      from: `"CollegeSecracy Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.TEAM_EMAIL, // Your team's email from .env
      subject: `New Contact Form Submission: ${queryType || 'General Inquiry'}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Query Type:</strong> ${queryType || 'General Inquiry'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    // Send both emails with error handling
    const [userResult, teamResult] = await Promise.all([
      transporter.sendMail(userMailOptions).catch(e => {
        console.error('Error sending user confirmation:', e);
        return null;
      }),
      transporter.sendMail(teamMailOptions).catch(e => {
        console.error('Error sending team notification:', e);
        return null;
      })
    ]);

    if (!userResult || !teamResult) {
      throw new AppError('Partial email delivery failure', 500);
    }

    res.status(200).json({
      status: 'success',
      message: 'Email sent successfully'
    });

  } catch (err) {
    console.error('Email sending error:', err);
    
    let errorMessage = 'There was an error sending the email.';
    if (err.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check email credentials.';
    } else if (err.code === 'EENVELOPE') {
      errorMessage = 'Email delivery failed. Please check recipient addresses.';
    }

    return next(new AppError(
      process.env.NODE_ENV === 'development' 
        ? `${errorMessage} Details: ${err.message}`
        : errorMessage,
      err.statusCode || 500
    ));
  }
};

export { sendEmail };