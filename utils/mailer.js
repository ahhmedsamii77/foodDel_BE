import nodemailer from 'nodemailer';

// ── Transporter (lazy) ────────────────────────────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required');
    }
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return _transporter;
}

export const sendEmail = ({ to, subject, html }) => {
  return new Promise((resolve, reject) => {
    const transporter = getTransporter();
    transporter.sendMail(
      {
        from: `"FoodDel 🍕" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      },
      (err, info) => {
        if (err) return reject(err);
        resolve(info);
      }
    );
  });
};

// ── Shared design tokens ───────────────────────────────────────────────────────
const COLORS = {
  primary:      '#f97316',   // orange-500
  primaryDark:  '#ea580c',   // orange-600
  primaryLight: '#fff7ed',   // orange-50
  bg:           '#ffffff',
  surface:      '#fafafa',
  border:       '#e5e7eb',
  text:         '#111827',
  muted:        '#6b7280',
  success:      '#10b981',
};

// ── Base email shell ───────────────────────────────────────────────────────────
function emailShell({ preheader = '', body = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>FoodDel</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: ${COLORS.primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body style="background-color:#f3f4f6; padding: 40px 16px;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0" border="0">

          <!-- ── Logo header ── -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark}); border-radius: 16px; padding: 14px 20px;">
                    <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      🍕&nbsp; FoodDel
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Card ── -->
          <tr>
            <td style="background-color:${COLORS.bg}; border-radius: 20px; border: 1px solid ${COLORS.border}; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
              ${body}
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td align="center" style="padding: 28px 0 8px;">
              <p style="font-size: 12px; color: ${COLORS.muted}; line-height: 1.6; margin: 0;">
                You received this email because you signed up for FoodDel.<br/>
                If this wasn't you, please ignore this email — no action is required.
              </p>
              <p style="font-size: 12px; color: #d1d5db; margin-top: 10px;">
                © ${new Date().getFullYear()} FoodDel. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── OTP display block ──────────────────────────────────────────────────────────
function otpBlock(otp) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding: 28px 0 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background: ${COLORS.primaryLight}; border: 2px dashed ${COLORS.primary}; border-radius: 14px; padding: 18px 36px;">
                <p style="font-size: 42px; font-weight: 800; letter-spacing: 14px; color: ${COLORS.primary}; font-family: 'Courier New', monospace; margin: 0;">${otp}</p>
              </td>
            </tr>
          </table>
          <p style="font-size: 13px; color: ${COLORS.muted}; margin-top: 12px;">
            This code expires in <strong style="color: ${COLORS.text};">10 minutes</strong>
          </p>
        </td>
      </tr>
    </table>`;
}

// ── Divider ────────────────────────────────────────────────────────────────────
const divider = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="border-top: 1px solid ${COLORS.border}; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
  </table>`;

// ── Send Confirm Email ───────────────────────────────────────────────────────
export const sendConfirmEmail = async (email, otp) => {
  console.log(`\n========================================`);
  console.log(`[OTP CONFIRM_EMAIL] Sending OTP to ${email}...`);
  console.log(`========================================\n`);
  try {
    await sendEmail({
      to: email,
      subject: 'Confirm your FoodDel account',
      html: emailShell({
        preheader: `Your FoodDel verification code is ${otp}`,
        body: `
          <!-- Orange accent bar -->
          <div style="height: 5px; background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark});"></div>

          <!-- Content -->
          <div style="padding: 36px 36px 8px;">
            <!-- Icon -->
            <div style="width:56px;height:56px;background:${COLORS.primaryLight};border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
              <span style="font-size:28px;">📧</span>
            </div>

            <h1 style="font-size: 22px; font-weight: 800; color: ${COLORS.text}; margin: 0 0 10px;">
              Confirm your email address
            </h1>
            <p style="font-size: 15px; color: ${COLORS.muted}; line-height: 1.7; margin: 0 0 4px;">
              Welcome to <strong style="color:${COLORS.primary};">FoodDel</strong>! 🎉 Use the code below to verify your email and start ordering.
            </p>
          </div>

          <!-- OTP -->
          <div style="padding: 0 36px;">
            ${otpBlock(otp)}
          </div>

          ${divider}

          <!-- Tips -->
          <div style="padding: 20px 36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px 14px; background: ${COLORS.surface}; border-radius: 10px; border-left: 3px solid ${COLORS.primary};">
                  <p style="font-size: 13px; color: ${COLORS.muted}; margin: 0; line-height: 1.6;">
                    <strong style="color: ${COLORS.text};">Tip:</strong> Don't share this code with anyone. FoodDel will never ask for it.
                  </p>
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    });
    console.log(`Email successfully sent to ${email}`);
  } catch (err) {
    console.error('Failed to send confirmation email:', err.message);
    console.log(`\n========================================`);
    console.log(`[DEVELOPMENT OTP BACKUP]`);
    console.log(`Confirmation OTP for ${email} is: ${otp}`);
    console.log(`========================================\n`);
  }
};

// ── Send Forgot Password Email ─────────────────────────────────────────────────────
export const sendForgotPasswordEmail = async (email, otp) => {
  console.log(`\n========================================`);
  console.log(`[OTP FORGOT_PASSWORD] Sending password reset OTP to ${email}...`);
  console.log(`========================================\n`);
  try {
    await sendEmail({
      to: email,
      subject: 'Reset your FoodDel password',
      html: emailShell({
        preheader: `Your FoodDel password reset code is ${otp}`,
        body: `
          <!-- Orange accent bar -->
          <div style="height: 5px; background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark});"></div>

          <!-- Content -->
          <div style="padding: 36px 36px 8px;">
            <!-- Icon -->
            <div style="width:56px;height:56px;background:${COLORS.primaryLight};border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
              <span style="font-size:28px;">🔑</span>
            </div>

            <h1 style="font-size: 22px; font-weight: 800; color: ${COLORS.text}; margin: 0 0 10px;">
              Reset your password
            </h1>
            <p style="font-size: 15px; color: ${COLORS.muted}; line-height: 1.7; margin: 0 0 4px;">
              We received a request to reset the password for your <strong style="color:${COLORS.primary};">FoodDel</strong> account. Use the code below to proceed.
            </p>
          </div>

          <!-- OTP -->
          <div style="padding: 0 36px;">
            ${otpBlock(otp)}
          </div>

          ${divider}

          <!-- Warning -->
          <div style="padding: 20px 36px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding: 10px 14px; background: #fef9f5; border-radius: 10px; border-left: 3px solid #f59e0b;">
                  <p style="font-size: 13px; color: ${COLORS.muted}; margin: 0; line-height: 1.6;">
                    <strong style="color: ${COLORS.text};">⚠️ Security notice:</strong> If you didn't request a password reset, your account may be at risk. Please ignore this email — your password will not change.
                  </p>
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    });
    console.log(`Email successfully sent to ${email}`);
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    console.log(`\n========================================`);
    console.log(`[DEVELOPMENT OTP BACKUP]`);
    console.log(`Password Reset OTP for ${email} is: ${otp}`);
    console.log(`========================================\n`);
  }
};
