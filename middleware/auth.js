import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {
  const { token } = req.headers;

  if (!token) {
    return res.json({
      success: false,
      message: "Not authorized, please login again",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.userId = decoded.id; // ✅ حطينا userId هنا
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ success: false, message: "Invalid token" }); // ✅ كانت req.json غلط
  }
};
export default authMiddleware;
