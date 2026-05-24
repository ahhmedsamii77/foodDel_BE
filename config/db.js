import mongoose from 'mongoose';

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<cluster>')) {
    throw new Error('MONGODB_URI is not configured or is a placeholder.');
  }

  // If already connecting, wait for the connection event
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false, // Disable buffering for serverless safety
  });
  console.log('DB connected successfully');
};