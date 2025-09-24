const express = require("express");
const router = express.Router();
const Ledger = require("../models/mongo/Ledger");

// GET all ledger entries
router.get("/", async (req, res) => {
  try {
    const { trip_id } = req.query;
    let query = {};
    if (trip_id) {
      query.trip_id = trip_id;
    }
    const entries = await Ledger.find(query).sort({ createdAt: -1 });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;