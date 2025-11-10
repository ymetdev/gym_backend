import { db } from "../db.js";

// 💰 GET all payments (รวมข้อมูลสมาชิก, package, staff)
export const getPayments = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.payment_id,
        p.amount,
        p.payment_date,
        m.first_name,
        m.last_name,
        pk.package_name,
        u.full_name AS staff_name
      FROM payments p
      JOIN members m ON p.member_id = m.member_id
      LEFT JOIN Packages pk ON p.package_id = pk.package_id
      JOIN users u ON p.staff_id = u.user_id
      ORDER BY p.payment_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔍 GET payment by ID
export const getPaymentById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `
      SELECT 
        p.*, 
        m.first_name, 
        m.last_name, 
        pk.package_name, 
        u.full_name AS staff_name
      FROM payments p
      JOIN members m ON p.member_id = m.member_id
      LEFT JOIN Packages pk ON p.package_id = pk.package_id
      JOIN users u ON p.staff_id = u.user_id
      WHERE p.payment_id = ?
      `,
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Payment not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➕ CREATE payment
export const createPayment = async (req, res) => {
  const { member_id, package_id, amount, staff_id } = req.body;

  // ตรวจสอบช่องว่าง
  if (!member_id || amount == null || !staff_id)
    return res.status(400).json({ message: "Missing required fields" });

  // ✅ ตรวจสอบว่า amount ต้องมากกว่า 0
  if (isNaN(amount) || amount <= 0)
    return res
      .status(400)
      .json({ message: "Invalid amount. Must be a positive number." });

  try {
    await db.query(
      `INSERT INTO payments (member_id, package_id, amount, payment_date, staff_id)
       VALUES (?, ?, ?, NOW(), ?)`,
      [member_id, package_id || null, amount, staff_id]
    );

    res.status(201).json({ message: "Payment recorded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ UPDATE payment (กรณีกรอกข้อมูลผิด)
export const updatePayment = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  // ❌ ถ้าไม่มี fields ให้ update
  if (Object.keys(fields).length === 0)
    return res.status(400).json({ error: "No fields provided to update" });

  try {
    // ✅ ตรวจสอบ amount ถ้ามีใน fields
    if (fields.amount !== undefined) {
      const amount = parseFloat(fields.amount);
      if (isNaN(amount) || amount <= 0) {
        return res
          .status(400)
          .json({ error: "Invalid amount. Must be a positive number." });
      }
    }

    // ✅ สร้าง dynamic SQL จาก fields ที่ส่งมา
    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      columns.push(`${key}=?`);
      values.push(value);
    }

    const sql = `UPDATE payments SET ${columns.join(", ")} WHERE payment_id=?`;
    values.push(id);

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({ message: "Payment updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ DELETE payment (Admin only)
export const deletePayment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM payments WHERE payment_id = ?", [id]);
    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
