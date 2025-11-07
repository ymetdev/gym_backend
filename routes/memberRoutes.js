import express from "express";
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from "../controllers/memberController.js";

import { verifyAdmin } from "../middlewares/auth.js";

const router = express.Router();

// Public (ดูข้อมูล)
router.get("/", getMembers);
router.get("/:id", getMemberById);

// Admin-only (จัดการข้อมูล)
router.post("/", verifyAdmin, createMember);
router.put("/:id", verifyAdmin, updateMember);
router.delete("/:id", verifyAdmin, deleteMember);

export default router;
