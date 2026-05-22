import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;
import bcrypt from 'bcrypt';
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
    await this.populate({ path: 'userId', select: 'email' });
  }
});

otpSchema.post('save', async function () {
  if (this._wasNew) {
    eventEmitter.emit(this.type, {
      email: this.userId.email,
      otp: this._plainCode,
    });
  }
});

export const OtpModel = models.Otp || model('Otp', otpSchema);
