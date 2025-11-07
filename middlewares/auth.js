// 📁 middlewares/auth.js
import jwt from "jsonwebtoken";

// ✅ ตรวจสอบ Token ว่ามีและถูกต้องไหม
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // header: "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user; // เก็บข้อมูล user จาก token
    next();
  });
};

// ✅ ตรวจสอบสิทธิ์เฉพาะ Admin
export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
};
