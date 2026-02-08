const express = require("express");
const router = express.Router();
const Trip = require("../models/mongo/Trip");

// Helper: Generate access code from destination and date
const generateLegacyAccessCode = (destination, startDate) => {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const date = new Date(startDate);
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  // Remove special chars and spaces, lowercase
  const destSlug = destination.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${destSlug}-${month}-${year}`;
};

// Helper: Ensure unique access code by adding suffix if needed
const ensureUniqueAccessCode = async (baseCode, excludeTripId = null) => {
  let code = baseCode;
  let suffix = 1;
  while (true) {
    const existing = await Trip.findOne({ accessCode: code });
    if (!existing || (excludeTripId && existing._id.toString() === excludeTripId.toString())) {
      break;
    }
    suffix++;
    code = `${baseCode}-${suffix}`;
  }
  return code;
};

// ===========================================
// ACCESS CODE ENDPOINTS
// ===========================================

// CHECK if access code is available
router.get("/check-code/:code", async (req, res) => {
  try {
    const code = req.params.code.toLowerCase().trim();
    const existing = await Trip.findOne({ accessCode: code });
    res.json({ available: !existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET trip by access code (public access point)
router.get("/code/:code", async (req, res) => {
  try {
    const code = req.params.code.toLowerCase().trim();
    const trip = await Trip.findOne({ accessCode: code });
    if (!trip) return res.status(404).json({ error: "Trip not found. Check your access code." });

    // If trip has security question, don't return full data yet
    if (trip.securityQuestion) {
      return res.json({
        requiresSecurityAnswer: true,
        securityQuestion: trip.securityQuestion,
        tripId: trip._id
      });
    }

    // Return trip without sensitive fields
    const safeTrip = trip.toObject();
    delete safeTrip.recoveryAnswer;
    delete safeTrip.securityAnswer;
    res.json(safeTrip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY security answer and get trip
router.post("/verify-security", async (req, res) => {
  try {
    const { tripId, securityAnswer } = req.body;
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    if (!trip.securityAnswer) {
      // No security question set, allow access
      const safeTrip = trip.toObject();
      delete safeTrip.recoveryAnswer;
      delete safeTrip.securityAnswer;
      return res.json(safeTrip);
    }

    if (securityAnswer.toLowerCase().trim() !== trip.securityAnswer) {
      return res.status(401).json({ error: "Incorrect answer. Please try again." });
    }

    // Correct answer - return trip
    const safeTrip = trip.toObject();
    delete safeTrip.recoveryAnswer;
    delete safeTrip.securityAnswer;
    res.json(safeTrip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RECOVER access code
router.post("/recover", async (req, res) => {
  try {
    const { name, destination, recoveryAnswer } = req.body;

    // Find trips matching name and destination (case-insensitive)
    const trips = await Trip.find({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      destination: { $regex: new RegExp(`^${destination.trim()}$`, 'i') }
    });

    if (trips.length === 0) {
      return res.status(404).json({ error: "No trip found with that name and destination." });
    }

    // For legacy trips without recovery answer
    const legacyTrip = trips.find(t => !t.recoveryAnswer && t.isLegacy);
    if (legacyTrip) {
      return res.json({
        accessCode: legacyTrip.accessCode,
        message: "This is a legacy trip. Consider adding recovery info for security."
      });
    }

    // Check recovery answer
    const matchingTrip = trips.find(t =>
      t.recoveryAnswer && t.recoveryAnswer === recoveryAnswer.toLowerCase().trim()
    );

    if (!matchingTrip) {
      return res.status(401).json({ error: "Recovery answer is incorrect." });
    }

    res.json({ accessCode: matchingTrip.accessCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// CRUD ENDPOINTS (by ID - for internal use)
// ===========================================

// GET all trips (kept for backwards compatibility, can be removed later)


// GET trip by id
router.get("/:id", async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    const safeTrip = trip.toObject();
    delete safeTrip.recoveryAnswer;
    delete safeTrip.securityAnswer;
    res.json(safeTrip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE trip
router.post("/", async (req, res) => {
  console.log("Received trip data:", req.body);
  try {
    const { accessCode, recoveryQuestion, recoveryAnswer, securityQuestion, securityAnswer, ...tripData } = req.body;

    // Validate access code
    if (!accessCode || accessCode.trim().length < 4) {
      return res.status(400).json({ error: "Access code must be at least 4 characters." });
    }

    // Check uniqueness
    const existingCode = await Trip.findOne({ accessCode: accessCode.toLowerCase().trim() });
    if (existingCode) {
      return res.status(400).json({ error: "This access code is already taken. Please choose another." });
    }

    // Validate recovery fields
    if (!recoveryQuestion || !recoveryAnswer) {
      return res.status(400).json({ error: "Recovery question and answer are required." });
    }

    // Create trip with all fields
    const trip = await Trip.create({
      ...tripData,
      accessCode: accessCode.toLowerCase().trim(),
      recoveryQuestion,
      recoveryAnswer: recoveryAnswer.toLowerCase().trim(),
      securityQuestion: securityQuestion || null,
      securityAnswer: securityAnswer ? securityAnswer.toLowerCase().trim() : null,
      isLegacy: false
    });

    // Return without sensitive fields
    const safeTrip = trip.toObject();
    delete safeTrip.recoveryAnswer;
    delete safeTrip.securityAnswer;
    res.status(201).json(safeTrip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE trip
router.put("/:id", async (req, res) => {
  try {
    // Don't allow updating sensitive fields directly
    const { recoveryAnswer, securityAnswer, accessCode, ...updateData } = req.body;

    const trip = await Trip.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const safeTrip = trip.toObject();
    delete safeTrip.recoveryAnswer;
    delete safeTrip.securityAnswer;
    res.json(safeTrip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE trip
router.delete("/:id", async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json({ message: "Trip deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;