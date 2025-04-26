import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";
import { body, validationResult } from "express-validator";
import multer from "multer";
import mongoose from "mongoose";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Email validation rules
const validateEmailWithPDF = [
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("rank").isInt({ min: 1, max: 2000000 }).withMessage("Rank must be positive integer (1-2,000,000)"),
  body("category").isString().trim().notEmpty().withMessage("Category is required"),
  body("name").optional().isString().trim().escape().isLength({ max: 100 }),
  body("counsellingType").optional().isString().trim().notEmpty().withMessage("Counselling Type is required"),
  body("round").optional().isString().trim().notEmpty().withMessage("Round is required"),
];

// Production Email Transporter Configuration
const createTransporter = () => {
  // Validate required environment variables
  const requiredVars = ['EMAIL_SERVICE', 'EMAIL_USER', 'EMAIL_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      // Only allow self-signed certificates in development
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    },
    pool: true,
    maxConnections: 5,
    rateLimit: true
  });
};

/**
 * @route POST /api/v1/email/send-with-pdf
 * @desc Send email with frontend-generated PDF (Production Ready)
 */
router.post("/send-with-pdf", upload.single('pdf'), validateEmailWithPDF, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }

  try {
    const { email, rank, category, name = "", counsellingType, round } = req.body;
    const pdfFile = req.file;

    // Validate PDF file
    if (!pdfFile || pdfFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        success: false, 
        error: "Valid PDF file is required"
      });
    }

    const transporter = createTransporter();
    
    // Verify connection before sending
    try {
      await transporter.verify();
    } catch (verifyError) {
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"College Predictor" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your College Predictions (Rank ${rank})`,
      html: generateEmailHTML({ name, rank, category, counsellingType, round }),
      attachments: [{
        filename: `college-predictions-${rank}.pdf`,
        content: pdfFile.buffer,
        contentType: 'application/pdf'
      }],
      priority: 'high'
    });

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId
    });

  } catch (error) {
    handleEmailError(res, error);
  }
});

function generateEmailHTML({ name, rank, category, counsellingType, round }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>College Predictor - Your Admission Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          width: 100% !important;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        
        .header {
          background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
          padding: 40px 20px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: "";
          position: absolute;
          top: -50px;
          right: -50px;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }
        
        .header::after {
          content: "";
          position: absolute;
          bottom: -80px;
          left: -80px;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }
        
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          position: relative;
          z-index: 1;
        }
        
        .header p {
          margin: 10px 0 0;
          font-size: 16px;
          opacity: 0.9;
          position: relative;
          z-index: 1;
        }
        
        .content {
          padding: 30px;
        }
        
        .greeting {
          font-size: 18px;
          margin-bottom: 25px;
          color: #1e3a8a;
          font-weight: 500;
        }
        
        .message {
          margin-bottom: 30px;
          font-size: 16px;
          color: #4b5563;
          line-height: 1.7;
        }
        
        .report-card {
          background: linear-gradient(to bottom right, #f8fafc, #f1f5f9);
          border-radius: 10px;
          padding: 25px;
          margin: 30px 0;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        
        .report-title {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 20px;
          font-size: 18px;
          display: flex;
          align-items: center;
        }
        
        .report-title::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 24px;
          background: #1e40af;
          margin-right: 12px;
          border-radius: 3px;
        }
        
        .parameter-box {
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
          margin-bottom: 15px;
        }
        
        .parameter-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .parameter-row:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .parameter-label {
          font-size: 15px;
          color: #6b7280;
          font-weight: 500;
          flex: 1;
        }
        
        .parameter-data {
          font-weight: 600;
          color: #111827;
          font-size: 15px;
          flex: 1;
          text-align: right;
          mrgin-left: 2px;
        }
        
        .rank-data {
          color: #1e40af;
          font-weight: 700;
        }
        
        .category-data {
          background-color: #e0e7ff;
          color: #4338ca;
          padding: 4px 10px;
          border-radius: 12px;
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
        }
        
        .counselling-data {
          color: #7c3aed;
          font-weight: 600;
        }
        
        .round-data {
          color: #1e40af;
          font-weight: 600;
        }
        
        .date-data {
          color: #047857;
          font-weight: 600;
        }
        
        .action-button {
          display: inline-block;
          padding: 14px 28px;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
          margin: 25px 0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }
        
        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        
        .disclaimer {
          font-size: 13px;
          color: #6b7280;
          margin-top: 35px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          line-height: 1.7;
        }
        
        .footer {
          text-align: center;
          padding: 25px;
          font-size: 13px;
          color: #9ca3af;
          background-color: #f3f4f6;
          border-top: 1px solid #e5e7eb;
        }
        
        .logo {
          text-align: center;
          margin-bottom: 15px;
        }
        
        .logo-text {
          font-weight: 700;
          color: #1e40af;
          font-size: 20px;
          letter-spacing: 0.5px;
        }
        
        .signature {
          margin-top: 25px;
          font-style: italic;
          color: #4b5563;
        }
        
        .contact-info {
          margin-top: 20px;
          font-size: 14px;
        }
        
        ul {
          margin-bottom: 25px;
          padding-left: 20px;
          color: #4b5563;
          line-height: 1.7;
        }
        
        li {
          margin-bottom: 8px;
        }
        
        @media only screen and (max-width: 480px) {
          .email-container {
            border-radius: 0;
          }
          
          .header {
            padding: 30px 15px;
          }
          
          .header h1 {
            font-size: 24px;
          }
          
          .content {
            padding: 25px 20px;
          }
          
          .report-card {
            padding: 20px;
          }
          
          .greeting {
            font-size: 16px;
          }
          
          .message {
            font-size: 15px;
          }
          
          .parameter-label {
            font-size: 14px;
          }
          
          .parameter-data {
          mrgin-left: 2px;
            font-size: 14px;
          }
          
          .action-button {
            padding: 12px 24px;
            font-size: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Your College Admission Report</h1>
          <p>Personalized analysis based on your JEE Main rank</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            ${name ? `<p>Dear ${name},</p>` : '<p>Dear Student,</p>'}
          </div>
          
          <div class="message">
            <p>We're pleased to share your personalized college admission report. This comprehensive analysis identifies institutions where you have the highest probability of admission based on your JEE Main rank and category.</p>
            <p>The attached PDF provides detailed insights including predicted colleges, branch details, admission probabilities, opening and closing ranks, and institution types.</p>
          </div>
          
          <div class="report-card">
            <div class="report-title">Admission Parameters</div>
            <div class="parameter-box">
              <div class="parameter-row">
                <div class="parameter-label">Your JEE Main Rank : </div>
                <div class="parameter-data rank-data">${rank ? `#${rank.toLocaleString()}` : 'Not provided'}</div>
              </div>
              
              <div class="parameter-row">
                <div class="parameter-label">Category : </div>
                <div class="parameter-data"><span class="category-data">${category || 'Not specified'}</span></div>
              </div>
              
              <div class="parameter-row">
                <div class="parameter-label">Counselling Type : </div>
                <div class="parameter-data counselling-data">${counsellingType || 'Not specified'}</div>
              </div>
              
              <div class="parameter-row">
                <div class="parameter-label">Round : </div>
                <div class="parameter-data round-data">${round ? `Round ${round}` : 'Not specified'}</div>
              </div>
              
              <div class="parameter-row">
                <div class="parameter-label">Report Date : </div>
                <div class="parameter-data date-data">
                  ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <p style="margin-bottom: 20px;">
            For your convenience, we've attached a detailed PDF report containing:
          </p>
          
          <ul style="margin-bottom: 25px; padding-left: 20px; color: #4b5563; line-height: 1.7;">
            <li>Predicted colleges based on your rank and preferences</li>
            <li>Details including College Name, Branch Name, Admission Probability</li>
            <li>Opening and Closing Ranks of each course</li>
            <li>Institute Type (e.g., NIT, IIT, IIIT, Other)</li>
          </ul>

          <p style="margin-bottom: 25px;">If you have any questions about your report or need guidance on the admission process, our counseling team is available to assist you.</p>
          
          <p class="signature">Best regards,<br>The College Secracy Team</p>
          
          <div class="disclaimer">
            <p><strong>Important Notice:</strong> This report is generated based on historical admission data and predictive algorithms. Actual admission results may vary based on current year competition, seat availability, and reservation policies.</p>
            <p>This is an auto-generated email. Please do not reply directly to this message.</p>
          </div>
          
          <div class="contact-info">
            <p>Need assistance? Contact our support team at <a href="mailto:helpcollegesecracy@gmail.com" style="color: #1e40af; text-decoration: none;">helpcollegesecracy@gmail.com</a></p>
          </div>
        </div>
        
        <div class="footer">
          <div class="logo">
            <div class="logo-text">College Predictor</div>
          </div>
          <p>© ${new Date().getFullYear()} College Predictor. All rights reserved.</p>
          <p>Powered by CollegeSecracy Analytics</p>
        </div>+
      </div>
    </body>
    </html>
  `;
}
// Production Error Handler
function handleEmailError(res, error) {
  console.error("Email error:", {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  const statusCode = error.message.includes('credentials') ? 401 : 500;

  res.status(statusCode).json({
    success: false,
    error: "Failed to send email",
    ...(process.env.NODE_ENV !== 'production' && {
      details: error.message
    })
  });
}

// Health Check Endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Email Service",
    time: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    emailConfigured: !!process.env.EMAIL_USER
  });
});

export default router;

