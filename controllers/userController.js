import { db } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 🧍 Get all users
export const getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, role, status FROM users"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➕ Create new user
export const createUser = async (req, res) => {
  const { username, password, full_name, role } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "Username and password required" });

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await db.query(
      "INSERT INTO users (username, password_hash, full_name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', NOW(), NOW())",
      [username, hash, full_name, role || "staff"]
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📝 Update user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  try {
    // ถ้า body ว่างเปล่า
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    // สร้าง query แบบ dynamic เช่น:
    // UPDATE users SET full_name=?, status=? WHERE id=?
    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      columns.push(`${key}=?`);
      values.push(value);
    }

    const sql = `UPDATE users SET ${columns.join(
      ", "
    )}, updated_at=NOW() WHERE user_id=?`;
    values.push(id);

    await db.query(sql, values);

    res.json({ message: "User updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ Delete user
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM users WHERE user_id=?", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔑 Login (JWT)
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    const user = rows[0];

    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { user_: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
