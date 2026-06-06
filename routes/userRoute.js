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
  updateProfile,
  adminGetAllUsers,
} from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
import adminMiddleware from '../middleware/admin.js';

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
userRouter.put('/profile', authMiddleware, updateProfile);
userRouter.post('/logout', authMiddleware, logout);

// Admin routes
userRouter.get('/all', adminMiddleware, adminGetAllUsers);

export default userRouter;