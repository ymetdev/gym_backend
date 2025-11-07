import { db } from "../db.js";

// 🧾 GET all checkins (รวมข้อมูลสมาชิก & staff)
export const getCheckins = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.checkin_id,
        c.check_in_time,
        c.check_out_time,
        m.first_name,
        m.last_name,
        u.full_name AS staff_name
      FROM checkins c
      JOIN members m ON c.member_id = m.member_id
      JOIN users u ON c.staff_id = u.user_id
      ORDER BY c.check_in_time DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 GET one checkin
export const getCheckinById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        c.*, 
        m.first_name, 
        m.last_name, 
        u.full_name AS staff_name
      FROM checkins c
      JOIN members m ON c.member_id = m.member_id
      JOIN users u ON c.staff_id = u.user_id
      WHERE c.checkin_id = ?
      `,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Check-in not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➕ CREATE checkin
export const createCheckin = async (req, res) => {
  const { member_id, staff_id } = req.body;

  if (!member_id || !staff_id)
    return res.status(400).json({ message: "member_id and staff_id required" });

  try {
    await db.query(
      `INSERT INTO checkins (member_id, check_in_time, staff_id) VALUES (?, NOW(), ?)`,
      [member_id, staff_id]
    );
    res.status(201).json({ message: "Check-in recorded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ UPDATE check-out time
export const updateCheckOut = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      `UPDATE checkins SET check_out_time = NOW() WHERE checkin_id = ?`,
      [id]
    );
    res.json({ message: "Check-out time updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ DELETE checkin record (admin only)
export const deleteCheckin = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM checkins WHERE checkin_id = ?`, [id]);
    res.json({ message: "Check-in deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
