import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<cluster>')) {
      console.warn('Warning: MONGODB_URI is not configured or is a placeholder.');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('DB connected successfully');
  } catch (error) {
    console.error('Database connection error:', error.message);
  }
};