const express = require("express");
const router = express.Router();
const { getDatabase } = require("../models/database");
const { addLedgerEntry } = require("../models/ledger");

const toCamelCase = (obj) => {
  if (!obj) return null;
  const newObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

// GET all payment users
router.get("/", (req, res) => {
  const db = getDatabase();
  db.all("SELECT * FROM payment_users ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(toCamelCase));
  });
});

// GET payment user by id
router.get("/:id", (req, res) => {
  const db = getDatabase();
  db.get("SELECT * FROM payment_users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Payment user not found" });
    res.json(toCamelCase(row));
  });
});

// CREATE payment user
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const db = getDatabase();
  const sql = `INSERT INTO payment_users (name) VALUES (?)`;
  db.run(sql, [name], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "Payment user with this name already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    const userId = this.lastID;
    db.get("SELECT * FROM payment_users WHERE id = ?", [userId], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      addLedgerEntry(`User ${row.name} (ID: ${userId}) was added.`);
      res.status(201).json(toCamelCase(row));
    });
  });
});

// UPDATE payment user
router.put("/:id", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const db = getDatabase();
  const sql = `UPDATE payment_users SET name=? WHERE id=?`;
  db.run(sql, [name, req.params.id], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "Payment user with this name already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0)
      return res.status(404).json({ error: "Payment user not found" });
    db.get("SELECT * FROM payment_users WHERE id = ?", [req.params.id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(toCamelCase(row));
    });
  });
});

// DELETE payment user
router.delete("/:id", (req, res) => {
  const db = getDatabase();
  const userId = req.params.id;
  db.get("SELECT name FROM payment_users WHERE id = ?", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Payment user not found" });

    const userName = row.name;
    db.run("DELETE FROM payment_users WHERE id = ?", [userId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Payment user not found" });
      addLedgerEntry(`User ${userName} (ID: ${userId}) was deleted.`);
      res.json({ message: "Payment user deleted successfully" });
    });
  });
});

module.exports = router;
