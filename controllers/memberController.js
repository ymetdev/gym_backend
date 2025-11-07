import { db } from "../db.js";

// 👥 Get all members (join packages)
export const getMembers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        m.member_id,
        m.first_name,
        m.last_name,
        m.phone_number,
        m.start_date,
        m.expiry_date,
        m.is_active,
        p.package_name,
        p.price
      FROM members m
      JOIN Packages p ON m.package_id = p.package_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 Get single member
export const getMemberById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT m.*, p.package_name 
       FROM members m 
       JOIN Packages p ON m.package_id = p.package_id 
       WHERE m.member_id = ?`,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Member not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➕ Create member
export const createMember = async (req, res) => {
  const {
    first_name,
    last_name,
    phone_number,
    package_id,
    start_date,
    expiry_date,
    photo_url,
    is_active,
  } = req.body;

  if (!first_name || !last_name || !package_id || !start_date)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    await db.query(
      `INSERT INTO members 
       (first_name, last_name, phone_number, package_id, start_date, expiry_date, photo_url, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        phone_number || null,
        package_id,
        start_date,
        expiry_date || null,
        photo_url || null,
        is_active ?? 1,
      ]
    );
    res.status(201).json({ message: "Member created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ Update member
export const updateMember = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (Object.keys(fields).length === 0)
    return res.status(400).json({ error: "No fields provided to update" });

  try {
    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      columns.push(`${key}=?`);
      values.push(value);
    }

    const sql = `UPDATE members SET ${columns.join(", ")} WHERE member_id=?`;
    values.push(id);

    await db.query(sql, values);
    res.json({ message: "Member updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ Delete member
export const deleteMember = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM members WHERE member_id=?", [id]);
    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
