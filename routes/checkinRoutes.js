import express from "express";
import {
  getCheckins,
  getCheckinById,
  createCheckin,
  updateCheckOut,
  deleteCheckin,
} from "../controllers/checkinController.js";

import { verifyAdmin, verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// ✅ แค่ล็อกอิน (staff/admin) ก็สามารถเช็คอิน/เช็คเอาท์ได้
router.get("/", verifyToken, getCheckins);
router.get("/:id", verifyToken, getCheckinById);
router.post("/", verifyToken, createCheckin);
router.put("/:id/checkout", verifyToken, updateCheckOut);

// ❌ ลบได้เฉพาะแอดมิน
router.delete("/:id", verifyAdmin, deleteCheckin);

export default router;
