import express from "express";
import {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
} from "../controllers/paymentController.js";

import { verifyAdmin, verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// ✅ แค่ล็อกอิน (staff/admin) ก็สามารถดูและเพิ่มได้
router.get("/", verifyToken, getPayments);
router.get("/:id", verifyToken, getPaymentById);
router.post("/", verifyToken, createPayment);

// ❌ ลบ/แก้ไขได้เฉพาะแอดมิน
router.put("/:id", verifyAdmin, updatePayment);
router.delete("/:id", verifyAdmin, deletePayment);

export default router;
