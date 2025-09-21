const express = require("express");
const router = express.Router();
const { getDatabase } = require("../models/database");

// GET all places
router.get("/", (req, res) => {
  const db = getDatabase();
  db.all("SELECT * FROM places ORDER BY created_at DESC", [], (err, rows) => {
    console.log(rows);
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET place by id
router.get("/:id", (req, res) => {
  const db = getDatabase();
  db.get("SELECT * FROM places WHERE id=?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Place not found" });
    res.json(row);
  });
});

// CREATE place
router.post("/", (req, res) => {
  const { name, category, estimatedDuration, notes, address } = req.body;
  const db = getDatabase();
  const sql = `INSERT INTO places (name, category, estimated_duration, notes, address) VALUES (?, ?, ?, ?, ?)`;
  db.run(
    sql,
    [name, category, estimatedDuration, notes, address],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM places WHERE id=?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(row);
      });
    }
  );
});

// UPDATE place
router.put("/:id", (req, res) => {
  const { name, category, estimatedDuration, notes, address } = req.body;
  const db = getDatabase();
  const sql = `UPDATE places SET name=?, category=?, estimated_duration=?, notes=?, address=? WHERE id=?`;
  db.run(
    sql,
    [name, category, estimatedDuration, notes, address, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Place not found" });
      db.get("SELECT * FROM places WHERE id=?", [req.params.id], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(row);
      });
    }
  );
});

// DELETE place
router.delete("/:id", (req, res) => {
  const db = getDatabase();
  db.run("DELETE FROM places WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Place not found" });
    res.json({ message: "Place deleted successfully" });
  });
});

// SEARCH places
router.get("/search/q", (req, res) => {
  const q = req.query.q || "";
  const db = getDatabase();
  db.all(
    "SELECT * FROM places WHERE name LIKE ? OR address LIKE ? ORDER BY created_at DESC",
    [`%${q}%`, `%${q}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
