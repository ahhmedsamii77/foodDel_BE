import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;
import bcrypt from 'bcryptjs';

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
  if (this.isModified('code')) {
    this.code = await bcrypt.hash(this.code, 10);
  }
});

export const OtpModel = models.Otp || model('Otp', otpSchema);
