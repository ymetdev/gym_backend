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

  // 1️⃣ ตรวจสอบ field ที่จำเป็น
  if (!first_name || !last_name || !package_id || !start_date) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // 2️⃣ ตรวจสอบชื่อ (ต้องเป็นตัวอักษรไทย/อังกฤษเท่านั้น)
  const nameRegex = /^[a-zA-Zก-ฮะ-์\s]+$/;
  if (!nameRegex.test(first_name) || !nameRegex.test(last_name)) {
    return res
      .status(400)
      .json({ message: "First name and last name must contain only letters" });
  }

  // 3️⃣ ตรวจสอบเบอร์โทรศัพท์ (อนุญาตเฉพาะตัวเลข 10 หลัก)
  if (phone_number) {
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({
        message: "Phone number must contain exactly 10 digits",
      });
    }
  }

  // 4️⃣ ตรวจสอบวันที่หมดอายุ (expiry_date) ต้องไม่มาก่อน start_date
  if (expiry_date && new Date(expiry_date) < new Date(start_date)) {
    return res.status(400).json({
      message: "Expiry date cannot be before start date",
    });
  }

  try {
    // 5️⃣ ตรวจสอบว่า package_id ที่เลือกมีอยู่จริงไหม
    const [packageExists] = await db.query(
      "SELECT * FROM Packages WHERE package_id = ?",
      [package_id]
    );
    if (packageExists.length === 0) {
      return res.status(400).json({ message: "Invalid package_id" });
    }

    // 6️⃣ ถ้าผ่านทุกเงื่อนไข → insert
    await db.query(
      `INSERT INTO members 
       (first_name, last_name, phone_number, package_id, start_date, expiry_date, photo_url, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name.trim(),
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

  // อนุญาตให้แก้ได้เฉพาะฟิลด์เหล่านี้เท่านั้น (whitelist)
  const allowed = new Set([
    "first_name",
    "last_name",
    "phone_number",
    "package_id",
    "start_date",
    "expiry_date",
    "photo_url",
    "is_active",
  ]);

  // ตรวจว่ามีฟิลด์ที่ไม่ได้อนุญาตมาหรือไม่
  for (const key of Object.keys(fields)) {
    if (!allowed.has(key)) {
      return res
        .status(400)
        .json({ error: `Field "${key}" is not allowed to update` });
    }
  }

  try {
    // ตรวจว่า member มีอยู่จริง
    const [memberRows] = await db.query(
      "SELECT * FROM members WHERE member_id = ?",
      [id]
    );
    if (memberRows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    // VALIDATIONS

    // 1) first_name / last_name: ห้ามเป็นค่าว่างหรือมีตัวเลข/อักขระพิเศษ
    const nameRegex = /^[a-zA-Zก-ฮะ-์\s]+$/;
    if (fields.first_name !== undefined) {
      const fn = String(fields.first_name).trim();
      if (!fn) {
        return res.status(400).json({ error: "First name cannot be empty" });
      }
      if (!nameRegex.test(fn)) {
        return res
          .status(400)
          .json({ error: "First name must contain only letters and spaces" });
      }
      fields.first_name = fn;
    }
    if (fields.last_name !== undefined) {
      const ln = String(fields.last_name).trim();
      if (!ln) {
        return res.status(400).json({ error: "Last name cannot be empty" });
      }
      if (!nameRegex.test(ln)) {
        return res
          .status(400)
          .json({ error: "Last name must contain only letters and spaces" });
      }
      fields.last_name = ln;
    }

    // 2) phone_number: ห้ามว่าง ห้ามตัวอักษร/อักขระพิเศษ — กำหนดเป็นตัวเลข 10 หลัก
    if (fields.phone_number !== undefined) {
      // ถ้ต้องการอนุญาตให้ลบเบอร์ (set เป็น NULL) ให้ส่งค่า null (ไม่ได้เป็น empty string)
      if (fields.phone_number === null) {
        // อนุญาตให้เป็น null — ถ้าคุณไม่ต้องการให้ลบ ให้เปลี่ยนเงื่อนไขนี้ให้ reject ด้วย
        // fields.phone_number = null; // already null
      } else {
        const pn = String(fields.phone_number).trim();
        if (!pn) {
          return res
            .status(400)
            .json({ error: "Phone number cannot be empty" });
        }
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(pn)) {
          return res
            .status(400)
            .json({ error: "Phone number must contain exactly 10 digits" });
        }
        fields.phone_number = pn;
      }
    }

    // 3) ถ้าจะเปลี่ยน package_id ให้เช็กว่ามี package นั้นจริง
    if (fields.package_id !== undefined) {
      const [pkgRows] = await db.query(
        "SELECT * FROM Packages WHERE package_id = ?",
        [fields.package_id]
      );
      if (pkgRows.length === 0) {
        return res.status(400).json({ error: "Invalid package_id" });
      }
    }

    // 4) วันที่: ถ้ามี start_date/expiry_date ให้ตรวจรูปแบบและ logic (expiry_date >= start_date ถ้ามีทั้งสอง)
    if (fields.start_date !== undefined && fields.start_date) {
      const sd = new Date(fields.start_date);
      if (Number.isNaN(sd.getTime())) {
        return res.status(400).json({ error: "Invalid start_date format" });
      }
      fields.start_date = sd.toISOString().slice(0, 19).replace("T", " "); // optional formatting
    }
    if (fields.expiry_date !== undefined && fields.expiry_date) {
      const ed = new Date(fields.expiry_date);
      if (Number.isNaN(ed.getTime())) {
        return res.status(400).json({ error: "Invalid expiry_date format" });
      }
      fields.expiry_date = ed.toISOString().slice(0, 19).replace("T", " ");
    }
    if (fields.start_date && fields.expiry_date) {
      if (new Date(fields.expiry_date) < new Date(fields.start_date)) {
        return res
          .status(400)
          .json({ error: "Expiry date cannot be before start date" });
      }
    }

    // 5) photo_url: ถ้ามี ให้ตรวจว่าไม่ใช่ค่าว่าง และถ้าต้องการตรวจ URL แบบง่าย:
    if (fields.photo_url !== undefined) {
      if (fields.photo_url === null) {
        // อนุญาตให้ลบรูป (set เป็น NULL) — ถ้าไม่ต้องการ ให้ reject
      } else {
        const pu = String(fields.photo_url).trim();
        if (!pu) {
          return res
            .status(400)
            .json({ error: "photo_url cannot be empty string" });
        }
        // เบื้องต้นเช็กว่าเป็น http/https URL (regex เรียบง่าย)
        const urlRegex = /^(https?:\/\/).+/i;
        if (!urlRegex.test(pu)) {
          return res
            .status(400)
            .json({ error: "photo_url must be a valid http/https URL" });
        }
        fields.photo_url = pu;
      }
    }

    // 6) is_active: ถ้ามี ให้ยอมรับเฉพาะ 0/1 หรือ boolean
    if (fields.is_active !== undefined) {
      if (fields.is_active === null) {
        return res.status(400).json({ error: "is_active cannot be null" });
      }
      const v = fields.is_active;
      if (
        !(
          v === 0 ||
          v === 1 ||
          v === "0" ||
          v === "1" ||
          v === true ||
          v === false
        )
      ) {
        return res
          .status(400)
          .json({ error: "is_active must be boolean or 0/1" });
      }
      fields.is_active = v === true || v === "1" || v === 1 ? 1 : 0;
    }

    // Build dynamic query (only from validated/allowed fields)
    const columns = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      columns.push(`${key} = ?`);
      values.push(value);
    }

    const sql = `UPDATE members SET ${columns.join(", ")} WHERE member_id = ?`;
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
