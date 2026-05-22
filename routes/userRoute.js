import express from 'express';
import {
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
} from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

const userRouter = express.Router();

// Public routes
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/confirm-email', confirmEmail);
userRouter.post('/resend-otp', resendOtp);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/verify-reset-otp', verifyResetPasswordOtp);
userRouter.post('/reset-password', resetPassword);

// Refresh token (uses refresh token in Authorization header — NOT the access token)
userRouter.get('/refresh-token', refreshToken);

// Protected routes
userRouter.get('/me', authMiddleware, getMe);
userRouter.post('/logout', authMiddleware, logout);

export default userRouter;