import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
} from "../controllers/userController.js";

const router = express.Router();

// CRUD Routes
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

// Auth
router.post("/login", loginUser);

export default router;
