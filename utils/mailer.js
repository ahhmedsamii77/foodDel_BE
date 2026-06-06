import nodemailer from 'nodemailer';

// ── Core sender ───────────────────────────────────────────────────────────────

export async function sendEmail({ to, subject, html }) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password — not your regular password
      },
      tls: {
        rejectUnauthorized: false, // required for some serverless environments
      },
    });

    const info = await transporter.sendMail({
      from: `"FoodDel 🍕" <${process.env.EMAIL_USER}>`,
      to: to || process.env.EMAIL_USER,
      subject: subject || 'Hello from FoodDel',
      html: html || '<h1>Hello</h1>',
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error('sendEmail error:', error.message);
    return false;
  }
}

// ── OTP Email Template ────────────────────────────────────────────────────────

function otpEmailTemplate({ title, subtitle, icon, otp, footerNote, accentColor = '#f97316', accentDark = '#ea580c' }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title} — FoodDel</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
           background:#fafafa; }
  </style>
</head>
<body style="background:#f3f4f6; padding:40px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto;">

    <!-- ── Header ── -->
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%);
                 border-radius:20px 20px 0 0; padding:32px 40px 24px;">
          <tr>
            <td>
              <!-- Logo -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.2); border-radius:12px;
                              width:44px; height:44px; text-align:center; vertical-align:middle;">
                    <span style="font-size:22px;">🍕</span>
                  </td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <span style="font-size:22px; font-weight:800; color:#fff; letter-spacing:-0.5px;">
                      FoodDel
                    </span>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.7); font-size:12px; margin-top:5px; margin-left:2px;">
                Fast & Fresh Food Delivery
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;">
              <h1 style="font-size:24px; font-weight:800; color:#fff; line-height:1.2; letter-spacing:-0.5px;">
                ${icon}&nbsp; ${title}
              </h1>
              <p style="color:rgba(255,255,255,0.8); font-size:14px; margin-top:8px; line-height:1.6;">
                ${subtitle}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Body ── -->
    <tr>
      <td style="background:#ffffff; padding:36px 40px;">

        <!-- OTP box -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align:center; padding-bottom:8px;">
              <p style="font-size:13px; color:#6b7280; margin-bottom:16px;">
                Your one-time verification code:
              </p>
              <!-- Gradient border wrapper -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg, ${accentColor}, ${accentDark});
                              border-radius:16px; padding:3px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#fff; border-radius:13px; padding:18px 48px;">
                          <span style="font-size:40px; font-weight:800; letter-spacing:12px;
                                       color:${accentColor}; font-family:'Courier New', monospace;">
                            ${otp}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="font-size:12px; color:#9ca3af; margin-top:14px;">
                This code expires in <strong style="color:${accentColor};">10 minutes</strong>
              </p>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
          <tr><td style="border-top:1px solid #f3f4f6;"></td></tr>
        </table>

        <!-- Info note -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#fafafa; border-radius:12px; padding:14px 18px;
                        border-left:3px solid ${accentColor};">
              <p style="font-size:13px; color:#6b7280; line-height:1.6;">
                ${footerNote}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Footer ── -->
    <tr>
      <td style="background:linear-gradient(135deg,#1c1917,#0c0a09); border-radius:0 0 20px 20px;
                  padding:22px 40px; text-align:center;">
        <p style="font-size:16px; font-weight:800; color:#fff; margin-bottom:4px;">FoodDel 🍕</p>
        <p style="font-size:12px; color:rgba(255,255,255,0.4); margin-bottom:10px;">
          Fast & Fresh Food Delivery
        </p>
        <p style="font-size:11px; color:rgba(255,255,255,0.25);">
          © ${new Date().getFullYear()} FoodDel. All rights reserved.<br/>
          You received this because you signed up at FoodDel.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`.trim();
}

// ── Send Confirm Email ────────────────────────────────────────────────────────

export const sendConfirmEmail = async (email, otp) => {
  console.log(`[OTP] Confirm email → ${email} | OTP: ${otp}`);

  const html = otpEmailTemplate({
    title: 'Verify Your Email',
    subtitle: 'Thanks for signing up! Use the code below to confirm your email and start ordering.',
    icon: '📧',
    otp,
    footerNote: `This code was requested for <strong style="color:#374151;">${email}</strong>.<br/>
                 If you didn't sign up, you can safely ignore this email.`,
  });

  const sent = await sendEmail({
    to: email,
    subject: 'Confirm your FoodDel account',
    html,
  });

  if (!sent) {
    console.warn(`[OTP BACKUP] Confirm OTP for ${email}: ${otp}`);
  }
};

// ── Send Forgot Password Email ────────────────────────────────────────────────

export const sendForgotPasswordEmail = async (email, otp) => {
  console.log(`[OTP] Forgot password → ${email} | OTP: ${otp}`);

  const html = otpEmailTemplate({
    title: 'Reset Your Password',
    subtitle: 'We received a request to reset your FoodDel password. Use the code below to proceed.',
    icon: '🔑',
    otp,
    footerNote: `<strong style="color:#374151;">⚠️ Security notice:</strong> If you didn't request a password reset,
                 please ignore this email — your password will not change.`,
  });

  const sent = await sendEmail({
    to: email,
    subject: 'Reset your FoodDel password',
    html,
  });

  if (!sent) {
    console.warn(`[OTP BACKUP] Reset OTP for ${email}: ${otp}`);
  }
};
