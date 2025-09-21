const express = require("express");
const router = express.Router();
const { getDatabase } = require("../models/database");

const toCamelCase = (obj) => {
  if (!obj) return null;
  const newObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

// GET all trips
router.get("/", (req, res) => {
  const db = getDatabase();
  db.all("SELECT * FROM trips ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(toCamelCase));
  });
});

// GET trip by id
router.get("/:id", (req, res) => {
  const db = getDatabase();
  db.get("SELECT * FROM trips WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Trip not found" });
    res.json(toCamelCase(row));
  });
});

// CREATE trip
router.post("/", (req, res) => {
  const {
    locationOfStay,
    checkInDate,
    checkOutDate,
    travelMode,
    numberOfPeople,
    budget,
    description,
  } = req.body;

  const db = getDatabase();
  const sql = `INSERT INTO trips (location_of_stay, check_in_date, check_out_date, travel_mode, number_of_people, budget, description)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(
    sql,
    [
      locationOfStay,
      checkInDate,
      checkOutDate,
      travelMode,
      numberOfPeople,
      budget,
      description,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM trips WHERE id = ?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(toCamelCase(row));
      });
    }
  );
});

// UPDATE trip
router.put("/:id", (req, res) => {
  const {
    locationOfStay,
    checkInDate,
    checkOutDate,
    travelMode,
    numberOfPeople,
    budget,
    description,
  } = req.body;
  const db = getDatabase();
  const sql = `UPDATE trips SET location_of_stay=?, check_in_date=?, check_out_date=?, travel_mode=?, number_of_people=?, budget=?, description=? WHERE id=?`;
  db.run(
    sql,
    [
      locationOfStay,
      checkInDate,
      checkOutDate,
      travelMode,
      numberOfPeople,
      budget,
      description,
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Trip not found" });
      db.get("SELECT * FROM trips WHERE id = ?", [req.params.id], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(toCamelCase(row));
      });
    }
  );
});

// DELETE trip
router.delete("/:id", (req, res) => {
  const db = getDatabase();
  db.run("DELETE FROM trips WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Trip not found" });
    res.json({ message: "Trip deleted successfully" });
  });
});

module.exports = router;