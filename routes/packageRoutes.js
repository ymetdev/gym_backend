import express from "express";
import {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} from "../controllers/packageController.js";

import { verifyAdmin } from "../middlewares/auth.js"; // ✅ ให้เฉพาะ Admin แก้ไขได้

const router = express.Router();

// Public routes
router.get("/", getPackages);
router.get("/:id", getPackageById);

// Admin-only routes
router.post("/", verifyAdmin, createPackage);
router.put("/:id", verifyAdmin, updatePackage);
router.delete("/:id", verifyAdmin, deletePackage);

export default router;
