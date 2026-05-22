import nodemailer from 'nodemailer';
import { eventEmitter } from './events.js';

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Food Delivery 🍕" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// ── Event Listeners ───────────────────────────────────────────────────────────

eventEmitter.on('CONFIRM_EMAIL', async ({ email, otp }) => {
  try {
    await sendEmail({
      to: email,
      subject: 'Confirm your Food Delivery account',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
          <h2 style="color:#f97316;margin-bottom:8px">🍕 Food Delivery</h2>
          <h3 style="color:#111827">Confirm your email</h3>
          <p style="color:#6b7280">Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f97316;text-align:center;padding:24px 0">${otp}</div>
          <p style="color:#9ca3af;font-size:12px">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send confirmation email:', err.message);
  }
});

eventEmitter.on('FORGOT_PASSWORD', async ({ email, otp }) => {
  try {
    await sendEmail({
      to: email,
      subject: 'Reset your Food Delivery password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e5e7eb">
          <h2 style="color:#f97316;margin-bottom:8px">🍕 Food Delivery</h2>
          <h3 style="color:#111827">Reset your password</h3>
          <p style="color:#6b7280">Use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#f97316;text-align:center;padding:24px 0">${otp}</div>
          <p style="color:#9ca3af;font-size:12px">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
  }
});
