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

const sendVerificationEmail = async (toEmail, token, type) => {
  let verificationLink = "";
  if(type === "reset")
  {
      verificationLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(toEmail)}`;
  }
  else
  {
      verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(toEmail)}&type=${type}`;
  }
    

  const config = {
    verify: {
      subject: "✨ Verify Your Email - CollegeSecracy",
      heading: "Verify Your Email Address",
      intro: "You're almost there! Please confirm your email address to activate your account.",
      cta: "Verify Email",
    },
    reset: {
      subject: "🔐 Reset Your Password - CollegeSecracy",
      heading: "Reset Your Password",
      intro: "We received a request to reset your password. Click below to proceed.",
      cta: "Reset Password",
    },
    reactivation: {
      subject: "♻️ Reactivate Your Account - CollegeSecracy",
      heading: "Reactivate Your Account",
      intro: "Let's get you back! Reactivate your CollegeSecracy account by clicking below.",
      cta: "Reactivate Now",
    },
  };

  const { subject, heading, intro, cta } = config[type] || config.verify;

  const mailOptions = {
    from: `"CollegeSecracy 📚" <${process.env.EMAIL_USERNAME}>`,
    to: toEmail,
    subject,
    html: `
    <div style="background-color:#f4f7fa;padding:30px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <div style="padding:32px 40px;text-align:center;">
          <h2 style="color:#2a2e6c;font-size:24px;margin-bottom:12px;">${heading}</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:24px;">${intro}</p>
          <a href="${verificationLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg,#4548F8,#6c6eff);color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">
            ${cta}
          </a>
          <p style="color:#888;font-size:13px;margin-top:24px;">This link will expire in <strong>10 minutes</strong>.</p>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:0" />
        <div style="padding:20px 30px;text-align:center;font-size:12px;color:#999;">
          Need help? Contact us at <a href="mailto:support@collegesecracy.com" style="color:#4548F8;text-decoration:none;">support@collegesecracy.com</a><br/>
          &copy; ${new Date().getFullYear()} CollegeSecracy. All rights reserved.
        </div>
      </div>
    </div>
    `,
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
    console.error("❌ Email sending failed:", error.message);
  }
};


export default sendVerificationEmail;
