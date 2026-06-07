import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

const adminMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ success: false, message: 'Authorization header is required' });
  }

  // Accept both "Bearer <token>" and "System <token>" prefixes
  const parts = authorization.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ success: false, message: 'Invalid authorization format' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);

    // Verify admin role from DB (source of truth) instead of relying on token payload
    const user = await userModel.findById(decoded.id).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    req.userId = decoded.id;
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default adminMiddleware;
