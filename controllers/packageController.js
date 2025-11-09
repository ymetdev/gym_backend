import { db } from "../db.js";

// 📦 GET all packages
export const getPackages = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM Packages");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📦 GET one package by ID
export const getPackageById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM Packages WHERE package_id = ?",
      [id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Package not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ➕ CREATE new package
export const createPackage = async (req, res) => {
  const { package_name, price, duration_days, description } = req.body;

  // 1️⃣ เช็กค่าว่าง
  if (!package_name || price == null || duration_days == null) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // 2️⃣ เช็กค่าติดลบ
  if (price < 0 || duration_days < 0) {
    return res
      .status(400)
      .json({ message: "Price and duration must be non-negative" });
  }

  try {
    // 3️⃣ เช็กชื่อซ้ำ
    const [existing] = await db.query(
      "SELECT * FROM Packages WHERE package_name = ?",
      [package_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Package name already exists" });
    }

    // 4️⃣ ถ้าไม่มีปัญหา → insert
    await db.query(
      "INSERT INTO Packages (package_name, price, duration_days, description) VALUES (?, ?, ?, ?)",
      [package_name, price, duration_days, description || null]
    );

    res.status(201).json({ message: "Package created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✏️ UPDATE package
export const updatePackage = async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  // 1️⃣ ไม่มีข้อมูลให้แก้ไข
  if (Object.keys(fields).length === 0)
    return res.status(400).json({ error: "No fields provided to update" });

  try {
    // 2️⃣ ตรวจสอบว่ามี package นี้อยู่จริงไหม
    const [existingPackage] = await db.query(
      "SELECT * FROM Packages WHERE package_id = ?",
      [id]
    );
    if (existingPackage.length === 0) {
      return res.status(404).json({ error: "Package not found" });
    }

    // 3️⃣ ถ้ามี package_name ใหม่ ต้องเช็กว่าชื่อไม่ซ้ำกับตัวอื่น
    if (fields.package_name) {
      const [duplicate] = await db.query(
        "SELECT * FROM Packages WHERE package_name = ? AND package_id != ?",
        [fields.package_name, id]
      );
      if (duplicate.length > 0) {
        return res.status(400).json({ error: "Package name already exists" });
      }

      if (fields.package_name.trim() === "") {
        return res.status(400).json({ error: "Package name cannot be empty" });
      }
    }

    // 4️⃣ ตรวจสอบว่าค่า price / duration_days ไม่เป็นค่าติดลบ
    if (fields.price != null && fields.price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }
    if (fields.duration_days != null && fields.duration_days < 0) {
      return res
        .status(400)
        .json({ error: "Duration days cannot be negative" });
    }

    // 5️⃣ ถ้าทุกอย่างผ่าน → สร้าง query แบบ dynamic
    const columns = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      columns.push(`${key}=?`);
      values.push(value);
    }

    const sql = `UPDATE Packages SET ${columns.join(", ")} WHERE package_id=?`;
    values.push(id);

    await db.query(sql, values);

    res.json({ message: "Package updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ❌ DELETE package
export const deletePackage = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM Packages WHERE package_id=?", [id]);
    res.json({ message: "Package deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
