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

  if (!package_name || !price || !duration_days) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
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

  if (Object.keys(fields).length === 0)
    return res.status(400).json({ error: "No fields provided to update" });

  try {
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
