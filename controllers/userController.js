import userModel from '../models/userModel.js';
import { OtpModel, OtpTypeEnum } from '../models/otpModel.js';
import { revokeTokenModel } from '../models/revokeTokenModel.js';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── Token helpers ─────────────────────────────────────────────────────────────

function createToken(payload, secret, expiresIn) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, secret, { expiresIn });
  return { token, jti };
}

function createLoginCredentials(userId, role) {
  const { token: access_token } = createToken(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    '15m',
  );
  const { token: refresh_token, jti: refresh_jti } = createToken(
    { id: userId, role },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    '7d',
  );
  return { access_token, refresh_token, refresh_jti };
}

async function sendOtp(userId, type = OtpTypeEnum.CONFIRM_EMAIL) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await OtpModel.create({
    code: otp,
    userId,
    type,
    expireAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  }); // ← email sent automatically via OTP post-save hook
}

// ── Register ──────────────────────────────────────────────────────────────────

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.create({ name, email, password: hashedPassword });
    await sendOtp(newUser._id, OtpTypeEnum.CONFIRM_EMAIL);
    res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email for the OTP.',
    });
  } catch (error) {
    console.error('registerUser error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Confirm Email ─────────────────────────────────────────────────────────────

const confirmEmail = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await userModel.findOne({ email, confirmedAt: { $exists: false } });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found or already confirmed' });

    const otpDoc = await OtpModel.findOne({
      userId: user._id,
      type: OtpTypeEnum.CONFIRM_EMAIL,
      isVerified: { $exists: false },
    });
    if (!otpDoc) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    const isValid = await bcrypt.compare(otp, otpDoc.code);
    if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    user.confirmedAt = new Date();
    await user.save();
    await OtpModel.deleteMany({ userId: user._id, type: OtpTypeEnum.CONFIRM_EMAIL });
    res.json({ success: true, message: 'Email confirmed successfully' });
  } catch (error) {
    console.error('confirmEmail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Resend OTP ────────────────────────────────────────────────────────────────

const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await userModel.findOne({ email, confirmedAt: { $exists: false } });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found or already confirmed' });

    const existing = await OtpModel.findOne({
      userId: user._id,
      type: OtpTypeEnum.CONFIRM_EMAIL,
      isVerified: { $exists: false },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An OTP already exists. Please wait for it to expire before requesting a new one.',
      });
    }
    await sendOtp(user._id, OtpTypeEnum.CONFIRM_EMAIL);
    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    console.error('resendOtp error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User doesn't exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.confirmedAt) {
      return res.status(403).json({
        success: false,
        message: 'Please confirm your email before logging in',
      });
    }

    const { access_token, refresh_token } = createLoginCredentials(user._id, user.role);
    res.json({
      success: true,
      data: { credentials: { access_token, refresh_token }, role: user.role },
    });
  } catch (error) {
    console.error('loginUser error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────

const refreshToken = async (req, res) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const [, token] = authorization.split(' ');
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
      );
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Check if this token has been revoked
    const revoked = await revokeTokenModel.findOne({ jti: decoded.jti });
    if (revoked) {
      return res.status(401).json({ success: false, message: 'Token has been revoked. Please login again.' });
    }

    const user = await userModel.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Rotate tokens — revoke old refresh token, issue new pair
    await revokeTokenModel.create({
      userId: user._id,
      jti: decoded.jti,
      expireIn: new Date(decoded.exp * 1000),
    });

    const { access_token, refresh_token: new_refresh_token } = createLoginCredentials(user._id, user.role);
    res.json({
      success: true,
      data: { credentials: { access_token, refresh_token: new_refresh_token } },
    });
  } catch (error) {
    console.error('refreshToken error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Get Me ────────────────────────────────────────────────────────────────────

const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId).select('-password -cartData');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────

const logout = async (req, res) => {
  try {
    const { authorization } = req.headers;
    if (authorization) {
      const [, token] = authorization.split(' ');
      try {
        // Try to revoke the refresh token if passed; silently skip if invalid
        const decoded = jwt.verify(
          token,
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
        );
        const already = await revokeTokenModel.findOne({ jti: decoded.jti });
        if (!already) {
          await revokeTokenModel.create({
            userId: req.userId,
            jti: decoded.jti,
            expireIn: new Date(decoded.exp * 1000),
          });
        }
      } catch (_) {
        // Refresh token may not be passed — that's fine
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await userModel.findOne({ email, confirmedAt: { $exists: true } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No confirmed account found with this email' });
    }
    const existing = await OtpModel.findOne({
      userId: user._id,
      type: OtpTypeEnum.FORGOT_PASSWORD,
      isVerified: { $exists: false },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A reset OTP already exists. Please check your email or wait for it to expire.',
      });
    }
    await sendOtp(user._id, OtpTypeEnum.FORGOT_PASSWORD);
    res.json({ success: true, message: 'Password reset OTP sent to your email' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Verify Reset Password OTP ─────────────────────────────────────────────────

const verifyResetPasswordOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await userModel.findOne({ email, confirmedAt: { $exists: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    const otpDoc = await OtpModel.findOne({
      userId: user._id,
      type: OtpTypeEnum.FORGOT_PASSWORD,
      isVerified: { $exists: false },
    });
    if (!otpDoc) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });

    const isValid = await bcrypt.compare(otp, otpDoc.code);
    if (!isValid) return res.status(400).json({ success: false, message: 'Incorrect OTP' });

    await OtpModel.updateOne({ _id: otpDoc._id }, { $set: { isVerified: true } });
    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('verifyResetPasswordOtp error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    const user = await userModel.findOne({ email, confirmedAt: { $exists: true } });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });

    const otpDoc = await OtpModel.findOne({
      userId: user._id,
      type: OtpTypeEnum.FORGOT_PASSWORD,
      isVerified: true,
    });
    if (!otpDoc) {
      return res.status(400).json({ success: false, message: 'Please verify your OTP before resetting password' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await OtpModel.deleteMany({ userId: user._id, type: OtpTypeEnum.FORGOT_PASSWORD });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Update Profile ────────────────────────────────────────────────────────────

const updateProfile = async (req, res) => {
  const { name } = req.body;
  try {
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }
    const user = await userModel.findByIdAndUpdate(
      req.userId,
      { name: name.trim() },
      { new: true, select: '-password -cartData' }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Admin: Get All Users ──────────────────────────────────────────────────────

const adminGetAllUsers = async (req, res) => {
  try {
    const users = await userModel
      .find({})
      .select('-password -cartData')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('adminGetAllUsers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export {
  loginUser,
  registerUser,
  confirmEmail,
  resendOtp,
  refreshToken,
  getMe,
  logout,
  forgotPassword,
  verifyResetPasswordOtp,
  resetPassword,
  updateProfile,
  adminGetAllUsers,
};
