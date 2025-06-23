import nodemailer from 'nodemailer';

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
export const sendInvoiceMail = async (email, name, invoicePath) => {
  const mailOptions = {
    from: `"CollegeSecracy" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `✅ Payment Successful – Your Invoice from CollegeSecracy`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background-color: #f9f9f9; color: #333;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <div style="background-color: #4A90E2; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">CollegeSecracy</h1>
            <p style="margin: 0; font-size: 14px;">Your Educational Partner</p>
          </div>
          <div style="padding: 30px;">
            <h2 style="margin-top: 0;">Hi ${name},</h2>
            <p>Thank you for your purchase! 🎉</p>
            <p>We’re excited to have you on board. Your payment has been successfully processed. Please find your invoice attached as a PDF document.</p>
            <p>If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:supportcollegesecracy@gmail.com">supportcollegesecracy@gmail.com</a>.</p>
            <p style="margin-top: 30px;">Best regards,<br><strong>Team CollegeSecracy</strong></p>
          </div>
          <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
            © ${new Date().getFullYear()} CollegeSecracy. All rights reserved.
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: 'invoice.pdf',
        path: invoicePath
      }
    ]
  };
const transporter = createTransporter();
    try {
      await transporter.verify();
    } catch (verifyError) {
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }
  try {
  await transporter.sendMail(mailOptions);
} catch (error) {
  console.error('❌ Email sending failed:', error.message);
}

};
