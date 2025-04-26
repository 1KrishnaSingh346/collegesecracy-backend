import nodemailer from 'nodemailer';
import pug from 'pug';
import { htmlToText } from 'html-to-text';

class Email {
  constructor(user, feedbackData) {
    this.to = process.env.FEEDBACK_NOTIFICATION_EMAIL;
    this.name = user.fullName;
    this.email = user.email;
    this.rating = feedbackData.rating;
    this.message = feedbackData.message;
    this.suggestions = feedbackData.suggestions || 'No suggestions provided';
    this.from = `CollegeSecrecy Feedback <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Sendgrid for production
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    // Mailtrap for development
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      name: this.name,
      email: this.email,
      rating: this.rating,
      message: this.message,
      suggestions: this.suggestions,
      subject
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html)
    };

    // 3) Create transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendFeedbackNotification() {
    await this.send(
      'feedback',
      `New Feedback Received (Rating: ${this.rating}/5)`
    );
  }
}

export const sendFeedbackEmail = (user, feedbackData) => {
  return new Email(user, feedbackData).sendFeedbackNotification();
};