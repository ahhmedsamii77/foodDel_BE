import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header is required',
    });
  }

  const [prefix, token] = authorization.split(' ');

  if (!prefix || !token || prefix !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token format. Use: Bearer <token>',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    );
    req.userId = decoded.id;
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
