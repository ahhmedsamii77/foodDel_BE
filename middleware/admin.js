import jwt from 'jsonwebtoken';

const adminMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ success: false, message: 'Authorization header is required' });
  }

  const [prefix, token] = authorization.split(' ');

  // Admin tokens use "System" prefix (set by the frontend api.ts)
  if (!prefix || !token || prefix !== 'System') {
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
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
