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

  // ✅ ตรวจว่ามีค่าครบ
  if (!username || !password || !full_name) {
    return res.status(400).json({
      message: "Username, password, and full name are required",
    });
  }

  // ✅ ตรวจ username: ห้ามว่าง, ห้ามเป็นช่องว่าง, ห้ามมี space
  const usernameRegex = /^[A-Za-z0-9._-]+$/; // อนุญาตเฉพาะตัวอักษร/ตัวเลข/._-
  if (!usernameRegex.test(username.trim()) || username.includes(" ")) {
    return res.status(400).json({
      message:
        "Username must contain only letters, numbers, dots, underscores, or hyphens (no spaces)",
    });
  }

  // ✅ ตรวจ password: ห้ามว่าง, ห้ามเป็นช่องว่างล้วน, ต้องมีความยาว >= 6 ตัว
  if (password.trim().length < 6) {
    return res.status(400).json({
      message:
        "Password must be at least 6 characters long and cannot contain only spaces",
    });
  }

  // ✅ ตรวจ full_name:
  // - ห้ามขึ้นต้นด้วยช่องว่าง
  // - ห้ามมีช่องว่างซ้อนกัน
  // - อนุญาตเฉพาะตัวอักษรและช่องว่างระหว่างคำ
  const nameRegex = /^(?! )[A-Za-z]+( [A-Za-z]+)*$/;
  if (!nameRegex.test(full_name)) {
    return res.status(400).json({
      message:
        "Full name must contain only English letters, cannot start with space, and cannot have multiple spaces",
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await db.query(
      "INSERT INTO users (username, password_hash, full_name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', NOW(), NOW())",
      [username.trim(), hash, full_name.trim(), role || "staff"]
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📝 Update user
export const updateUser = async (req, res) => {
  const { id } = req.params; // id ของ user ที่จะอัปเดต (user_id)
  const fields = { ...req.body }; // สำเนาเพื่อแก้ไขได้ปลอดภัย

  try {
    // ถ้า body ว่างเปล่า
    if (!fields || Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    // --- กำหนดฟิลด์ที่อนุญาตให้เปลี่ยนได้ (whitelist) ---
    const allowedFields = [
      "username",
      "password",
      "full_name",
      "role",
      "status",
    ];
    const updates = {};
    for (const [k, v] of Object.entries(fields)) {
      if (allowedFields.includes(k)) updates[k] = v;
      // ถ้าเจอฟิลด์ที่ไม่อนุญาต จะถูกข้ามโดยอัตโนมัติ
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    // --- VALIDATIONS ---
    // username: ห้ามมีช่องว่าง, อนุญาตแค่ A-Z a-z 0-9 . _ -
    if (updates.username !== undefined) {
      const username = String(updates.username).trim();
      const usernameRegex = /^[A-Za-z0-9._-]+$/;
      if (
        !username ||
        !usernameRegex.test(username) ||
        username.includes(" ")
      ) {
        return res.status(400).json({
          error:
            "Username must contain only letters, numbers, dots, underscores, or hyphens (no spaces)",
        });
      }

      // ตรวจว่าชื่อผู้ใช้ไม่ซ้ำกับคนอื่น (exclude ตัวเอง)
      const [existing] = await db.query(
        "SELECT user_id FROM users WHERE username = ? AND user_id <> ?",
        [username, id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: "Username already taken" });
      }

      updates.username = username;
    }

    // password: ห้ามเว้นว่างล้วน, ต้องมีความยาว >= 6
    if (updates.password !== undefined) {
      const pwd = String(updates.password);
      if (pwd.trim().length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters long and cannot be only spaces",
        });
      }
      // ทำ hashing และเปลี่ยนเป็น password_hash แทน
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(pwd, salt);
      updates.password_hash = hash;
      delete updates.password; // อย่าเก็บ plaintext
    }

    // full_name: ห้ามขึ้นต้นด้วย space, ห้ามมี space ซ้อน, อนุญาตเฉพาะตัวอักษรและช่องว่าง
    if (updates.full_name !== undefined) {
      const fullName = String(updates.full_name);
      const nameRegex = /^(?! )[A-Za-z]+( [A-Za-z]+)*$/;
      if (!nameRegex.test(fullName)) {
        return res.status(400).json({
          error:
            "Full name must contain only English letters, cannot start with space, and cannot have multiple spaces",
        });
      }
      updates.full_name = fullName.trim();
    }

    // role: ถ้ามี ให้ตรวจว่าเป็นค่าที่อนุญาต (ปรับแก้ได้เฉพาะค่าที่ระบบยอมรับ)
    if (updates.role !== undefined) {
      const allowedRoles = ["admin", "staff"];
      if (!allowedRoles.includes(String(updates.role))) {
        return res.status(400).json({ error: "Invalid role value" });
      }
    }

    // status: ตรวจค่าที่อนุญาต
    if (updates.status !== undefined) {
      const allowedStatus = ["active", "inactive"];
      if (!allowedStatus.includes(String(updates.status))) {
        return res.status(400).json({ error: "Invalid status value" });
      }
    }

    // --- สร้าง dynamic update query (ปลอดภัยด้วย parameterized values) ---
    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      // อย่าให้ผู้ใช้อัปเดต created_at หรือ user_id ผ่านไฟล์นี้ (ไม่อยู่ใน allowedFields)
      columns.push(`${key} = ?`);
      values.push(value);
    }

    // ถ้าไม่มี columns อะไรจะไม่รัน
    if (columns.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const sql = `UPDATE users SET ${columns.join(
      ", "
    )}, updated_at = NOW() WHERE user_id = ?`;
    values.push(id);

    await db.query(sql, values);

    res.json({ message: "User updated successfully" });
  } catch (err) {
    // ถ้าฐานข้อมูลส่ง error ระบุค่า duplicate key, สามารถจับแยกได้ (ตัวอย่าง)
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Duplicate entry" });
    }
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
