// 📁 routes/userRoutes.js
import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
} from "../controllers/userController.js";
import { verifyToken, verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// ✅ ต้องล็อกอินถึงจะดูได้
router.get("/", verifyToken, getUsers);

// ✅ ต้องเป็น Admin ถึงจะสร้างได้
router.post("/", verifyAdmin, createUser);

// ✅ ต้องล็อกอินถึงจะแก้ไข/ลบได้
router.put("/:id", verifyToken, updateUser);
router.delete("/:id", verifyAdmin, deleteUser);

// 🔑 Login ไม่ต้องใช้ Token
router.post("/login", loginUser);

export default router;
