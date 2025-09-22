const express = require("express");
const router = express.Router();
const DayPlan = require("../models/mongo/DayPlan");
const DayPlanPlace = require("../models/mongo/DayPlanPlace");
const Place = require("../models/mongo/Place");

// Helper to group day plans with nested items
const groupItinerary = (dayPlans) => {
  const grouped = dayPlans.map(dp => {
    const items = dp.places.map(dpp => ({
      _id: dpp._id,
      placeId: dpp.place_id._id,
      placeName: dpp.place_id.name,
      category: dpp.place_id.category,
      estimatedDuration: dpp.place_id.estimated_duration,
      notes: dpp.place_id.notes,
      address: dpp.place_id.address,
      startTime: dpp.start_time,
      endTime: dpp.end_time,
      order: dpp.order_index,
      travelTimeToNext: dpp.travel_time_to_next,
    }));
    return {
      _id: dp._id,
      trip_id: dp.trip_id,
      date: dp.date,
      items: items.sort((a, b) => a.order - b.order),
    };
  });
  return grouped.sort((a, b) => a.date.localeCompare(b.date));
};

// GET itinerary for a trip (grouped)
router.get("/:tripId", async (req, res) => {
  try {
    const dayPlans = await DayPlan.find({ trip_id: req.params.tripId }).populate({
      path: "places", // Assuming a virtual populate for places in DayPlan model
      populate: {
        path: "place_id",
        model: "Place",
      },
    });
    console.log("Backend Itinerary data sent:", dayPlans);
    res.json(groupItinerary(dayPlans));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE day plan
router.post("/", async (req, res) => {
  const { tripId, date } = req.body;
  try {
    const newDayPlan = await DayPlan.create({ trip_id: tripId, date });
    console.log("Backend DayPlan created:", newDayPlan);
    res.status(201).json(newDayPlan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE day plan date
router.put("/:dayPlanId", async (req, res) => {
  const { date } = req.body;
  try {
    const updatedDayPlan = await DayPlan.findByIdAndUpdate(
      req.params.dayPlanId,
      { date },
      { new: true, runValidators: true }
    );
    if (!updatedDayPlan)
      return res.status(404).json({ error: "Day plan not found" });
    res.json(updatedDayPlan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE day plan
router.delete("/:dayPlanId", async (req, res) => {
  try {
    const deletedDayPlan = await DayPlan.findByIdAndDelete(req.params.dayPlanId);
    if (!deletedDayPlan)
      return res.status(404).json({ error: "Day plan not found" });
    // Also delete associated DayPlanPlaces
    await DayPlanPlace.deleteMany({ day_plan_id: req.params.dayPlanId });
    res.json({ message: "Day plan deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD place to a day
router.post("/:dayPlanId/places", async (req, res) => {
  const { placeId, startTime, endTime, order, travelTimeToNext } = req.body;
  try {
    const newDayPlanPlace = await DayPlanPlace.create({
      day_plan_id: req.params.dayPlanId,
      place_id: placeId,
      start_time: startTime,
      end_time: endTime,
      order_index: order,
      travel_time_to_next: travelTimeToNext || null,
    });
    res.status(201).json(newDayPlanPlace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a place within day
router.put("/:dayPlanId/places/:id", async (req, res) => {
  const { placeId, startTime, endTime, order, travelTimeToNext } = req.body;
  try {
    const updatedDayPlanPlace = await DayPlanPlace.findOneAndUpdate(
      { _id: req.params.id, day_plan_id: req.params.dayPlanId },
      {
        place_id: placeId,
        start_time: startTime,
        end_time: endTime,
        order_index: order,
        travel_time_to_next: travelTimeToNext || null,
      },
      { new: true, runValidators: true }
    );
    if (!updatedDayPlanPlace)
      return res.status(404).json({ error: "Item not found" });
    res.json(updatedDayPlanPlace);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a place from day
router.delete("/:dayPlanId/places/:id", async (req, res) => {
  try {
    const deletedDayPlanPlace = await DayPlanPlace.findOneAndDelete({
      _id: req.params.id,
      day_plan_id: req.params.dayPlanId,
    });
    if (!deletedDayPlanPlace)
      return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REORDER items in day
router.put("/:dayPlanId/reorder", async (req, res) => {
  const { order } = req.body; // [{id, order}, ...]
  try {
    const updates = order.map((o) =>
      DayPlanPlace.findOneAndUpdate(
        { _id: o.id, day_plan_id: req.params.dayPlanId },
        { order_index: o.order }
      )
    );
    await Promise.all(updates);
    res.json({ message: "Reordered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
