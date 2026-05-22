import { models, Schema, model } from 'mongoose';

const revokeTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    expireIn: { type: Date, required: true },
    jti: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

// TTL index — MongoDB auto-deletes expired revoke records
revokeTokenSchema.index({ expireIn: 1 }, { expireAfterSeconds: 0 });

export const revokeTokenModel =
  models.RevokeToken || model('RevokeToken', revokeTokenSchema);
