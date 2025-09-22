const express = require("express");
const router = express.Router();
const { getAllLedgerEntries } = require("../models/ledger");

// GET all ledger entries
router.get("/", async (req, res) => {
  try {
    const entries = await getAllLedgerEntries();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;