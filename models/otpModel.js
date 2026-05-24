import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;
import bcrypt from 'bcryptjs';
import { eventEmitter } from '../utils/events.js';

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

otpSchema.pre('save', async function () {
  this._wasNew = this.isNew;
  if (this.isModified('code')) {
    this._plainCode = this.code;
    this.code = await bcrypt.hash(this.code, 10);
  }
});

otpSchema.post('save', async function () {
  if (this._wasNew) {
    try {
      const user = await mongoose.model('user').findById(this.userId);
      if (user && user.email) {
        eventEmitter.emit(this.type, {
          email: user.email,
          otp: this._plainCode,
        });
      } else {
        console.error('OTP post-save hook: User or user email not found for ID', this.userId);
      }
    } catch (err) {
      console.error('OTP post-save hook error:', err.message);
    }
  }
});

export const OtpModel = models.Otp || model('Otp', otpSchema);
