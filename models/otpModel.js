import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;
import bcrypt from 'bcryptjs';
import { sendConfirmEmail, sendForgotPasswordEmail } from '../utils/mailer.js';

export const OtpTypeEnum = {
  CONFIRM_EMAIL: 'CONFIRM_EMAIL',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
};

const otpSchema = new Schema(
  {
    code: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'user' },
    type: { type: String, enum: Object.values(OtpTypeEnum), required: true },
    expireAt: { type: Date, required: true },
    isVerified: { type: Boolean },
  },
  { timestamps: true },
);

// TTL index — MongoDB auto-deletes expired OTPs
otpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// ── Pre-save: hash code but save plain text temporarily for the post-save hook ──
otpSchema.pre('save', async function () {
  if (this.isModified('code')) {
    this._plainCode = this.code; // keep plain before hashing
    this.code = await bcrypt.hash(this.code, 10);
  }
});

// ── Post-save: send email automatically (same pattern as DriveEase) ──────────
otpSchema.post('save', async function () {
  if (!this._plainCode) return; // only runs after a fresh OTP creation

  try {
    const userModel = mongoose.model('user');
    const user = await userModel.findById(this.userId).select('email name');
    if (!user?.email) {
      console.error('[OTP post-save] User or email not found for ID:', this.userId);
      return;
    }

    if (this.type === OtpTypeEnum.CONFIRM_EMAIL) {
      await sendConfirmEmail(user.email, this._plainCode);
    } else if (this.type === OtpTypeEnum.FORGOT_PASSWORD) {
      await sendForgotPasswordEmail(user.email, this._plainCode);
    }
  } catch (err) {
    console.error('[OTP post-save] Failed to send email:', err.message);
  } finally {
    this._plainCode = null; // clear after use
  }
});

export const OtpModel = models.Otp || model('Otp', otpSchema);
