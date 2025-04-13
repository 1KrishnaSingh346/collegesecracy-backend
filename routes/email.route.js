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
  body("name").optional().isString().trim().escape().isLength({ max: 100 })
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
    const { email, rank, category, name = "" } = req.body;
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
      html: generateEmailHTML({ name, rank, category }),
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

// Production Email Template
function generateEmailHTML({ name, rank, category }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>College Predictor Pro - Your Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        
        body {
          font-family: 'Poppins', Arial, sans-serif;
          line-height: 1.6;
          color: #333333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        
        .email-container {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 30px 20px;
          text-align: center;
          color: white;
        }
        
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .header p {
          margin: 10px 0 0;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
        }
        
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        
        .message {
          margin-bottom: 25px;
          font-size: 15px;
        }
        
        .report-card {
          background: #f8fafc;
          border-radius: 6px;
          padding: 20px;
          margin: 25px 0;
          border-left: 4px solid #1e40af;
        }
        
        .report-title {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 10px;
          font-size: 16px;
        }
        
        .report-details {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .detail-item {
          flex: 1;
          min-width: 120px;
        }
        
        .detail-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        
        .detail-value {
          font-weight: 500;
          color: #111827;
        }
        
        .action-button {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          text-align: center;
          margin: 20px 0;
        }
        
        .disclaimer {
          font-size: 12px;
          color: #6b7280;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #9ca3af;
          background-color: #f3f4f6;
        }
        
        .logo {
          text-align: center;
          margin-bottom: 15px;
        }
        
        .logo-text {
          font-weight: 600;
          color: #1e40af;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Your College Predictor Report</h1>
          <p>Detailed analysis of your college admission chances</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            ${name ? `<p>Dear ${name},</p>` : '<p>Hello,</p>'}
          </div>
          
          <div class="message">
            <p>Thank you for using College Predictor Pro. Your personalized college admission report is ready and attached with this email.</p>
            <p>This report contains detailed analysis of colleges you can target based on your JEE Main rank and category.</p>
          </div>
          
          <div class="report-card">
            <div class="report-title">Report Summary</div>
            <div class="report-details">
              <div class="detail-item">
                <div class="detail-label">Your Rank</div>
                <div class="detail-value">${rank}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Category</div>
                <div class="detail-value">${category}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Report Date</div>
                <div class="detail-value">${new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
          
          <p>For your convenience, we've attached a PDF version of your complete report. You can also access your results anytime by visiting our portal.</p>
          
          <center>
            <a href="${process.env.FRONTEND_URL || '#'}" class="action-button">
              View Full Results Online
            </a>
          </center>
          
          <div class="disclaimer">
            <p><strong>Important:</strong> This is an auto-generated email. Please do not reply directly to this message.</p>
            <p>Predictions are based on historical data and cutoff trends. Actual admission results may vary depending on current year competition and seat availability.</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="logo">
            <div class="logo-text">College Predictor Pro</div>
          </div>
          <p>© ${new Date().getFullYear()} College Predictor Pro. All rights reserved.</p>
          <p>Need help? Contact our support team at support@collegepredictor.com</p>
        </div>
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