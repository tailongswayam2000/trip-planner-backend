const express = require("express");
const router = express.Router();
const Place = require("../models/mongo/Place");

// GET all places
router.get("/", async (req, res) => {
  try {
    const places = await Place.find().sort({ createdAt: -1 });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET place by id
router.get("/:id", async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE place
router.post("/", async (req, res) => {
  console.log("Received place data:", req.body);
  try {
    const place = await Place.create(req.body);
    res.status(201).json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE place
router.put("/:id", async (req, res) => {
  try {
    const place = await Place.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.json(place);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE place
router.delete("/:id", async (req, res) => {
  try {
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.json({ message: "Place deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH places
router.get("/search/q", async (req, res) => {
  const q = req.query.q || "";
  try {
    const places = await Place.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });
    res.json(places);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
