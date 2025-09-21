const express = require("express");
const router = express.Router();
const { getDatabase } = require("../models/database");

// Helper to group day plans with nested items
const groupItinerary = (rows) => {
  const byDay = new Map();
  rows.forEach((r) => {
    if (!byDay.has(r.dp_id)) {
      byDay.set(r.dp_id, {
        id: r.dp_id,
        tripId: r.trip_id,
        date: r.date,
        items: [],
      });
    }
    if (r.dpp_id) {
      byDay.get(r.dp_id).items.push({
        id: r.dpp_id,
        placeId: r.place_id,
        placeName: r.name,
        category: r.category,
        estimatedDuration: r.estimated_duration,
        notes: r.notes,
        address: r.address,
        startTime: r.start_time,
        endTime: r.end_time,
        order: r.order_index,
        travelTimeToNext: r.travel_time_to_next,
      });
    }
  });
  return Array.from(byDay.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
};

// GET itinerary for a trip (grouped)
router.get("/:tripId", (req, res) => {
  const db = getDatabase();
  const sql = `
    SELECT 
      dp.id as dp_id, dp.trip_id, dp.date,
      dpp.id as dpp_id, dpp.place_id, dpp.start_time, dpp.end_time, dpp.order_index, dpp.travel_time_to_next,
      p.name, p.category, p.estimated_duration, p.notes, p.address
    FROM day_plans dp
    LEFT JOIN day_plan_places dpp ON dp.id = dpp.day_plan_id
    LEFT JOIN places p ON dpp.place_id = p.id
    WHERE dp.trip_id = ?
    ORDER BY dp.date ASC, dpp.order_index ASC
  `;
  db.all(sql, [req.params.tripId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(groupItinerary(rows));
  });
});

// CREATE day plan
router.post("/", (req, res) => {
  const { tripId, date } = req.body;
  const db = getDatabase();
  db.run(
    "INSERT INTO day_plans (trip_id, date) VALUES (?, ?)",
    [tripId, date],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM day_plans WHERE id=?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(row);
      });
    }
  );
});

// UPDATE day plan date
router.put("/:dayPlanId", (req, res) => {
  const { date } = req.body;
  const db = getDatabase();
  db.run(
    "UPDATE day_plans SET date=? WHERE id=?",
    [date, req.params.dayPlanId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Day plan not found" });
      db.get(
        "SELECT * FROM day_plans WHERE id=?",
        [req.params.dayPlanId],
        (e, row) => {
          if (e) return res.status(500).json({ error: e.message });
          res.json(row);
        }
      );
    }
  );
});

// DELETE day plan
router.delete("/:dayPlanId", (req, res) => {
  const db = getDatabase();
  db.run(
    "DELETE FROM day_plans WHERE id=?",
    [req.params.dayPlanId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Day plan not found" });
      res.json({ message: "Day plan deleted successfully" });
    }
  );
});

// ADD place to a day
router.post("/:dayPlanId/places", (req, res) => {
  const { placeId, startTime, endTime, order, travelTimeToNext } = req.body;
  const db = getDatabase();
  const sql = `INSERT INTO day_plan_places (day_plan_id, place_id, start_time, end_time, order_index, travel_time_to_next)
               VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(
    sql,
    [
      req.params.dayPlanId,
      placeId,
      startTime,
      endTime,
      order,
      travelTimeToNext || null,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT * FROM day_plan_places WHERE id=?",
        [this.lastID],
        (e, row) => {
          if (e) return res.status(500).json({ error: e.message });
          res.status(201).json(row);
        }
      );
    }
  );
});

// UPDATE a place within day
router.put("/:dayPlanId/places/:id", (req, res) => {
  const { placeId, startTime, endTime, order, travelTimeToNext } = req.body;
  const db = getDatabase();
  const sql = `UPDATE day_plan_places SET place_id=?, start_time=?, end_time=?, order_index=?, travel_time_to_next=? WHERE id=? AND day_plan_id=?`;
  db.run(
    sql,
    [
      placeId,
      startTime,
      endTime,
      order,
      travelTimeToNext || null,
      req.params.id,
      req.params.dayPlanId,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Item not found" });
      db.get(
        "SELECT * FROM day_plan_places WHERE id=?",
        [req.params.id],
        (e, row) => {
          if (e) return res.status(500).json({ error: e.message });
          res.json(row);
        }
      );
    }
  );
});

// DELETE a place from day
router.delete("/:dayPlanId/places/:id", (req, res) => {
  const db = getDatabase();
  db.run(
    "DELETE FROM day_plan_places WHERE id=? AND day_plan_id=?",
    [req.params.id, req.params.dayPlanId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Item not found" });
      res.json({ message: "Item deleted successfully" });
    }
  );
});

// REORDER items in day
router.put("/:dayPlanId/reorder", (req, res) => {
  const { order } = req.body; // [{id, order}, ...]
  const db = getDatabase();
  db.serialize(() => {
    const stmt = db.prepare(
      "UPDATE day_plan_places SET order_index=? WHERE id=? AND day_plan_id=?"
    );
    order.forEach((o) => {
      stmt.run([o.order, o.id, req.params.dayPlanId]);
    });
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Reordered successfully" });
    });
  });
});

module.exports = router;
