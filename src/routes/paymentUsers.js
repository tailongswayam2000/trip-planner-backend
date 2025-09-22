const express = require("express");
const router = express.Router();
const PaymentUser = require("../models/mongo/PaymentUser");
const Ledger = require("../models/mongo/Ledger");
const Expense = require("../models/mongo/Expense");

// GET all payment users
router.get("/", async (req, res) => {
  try {
    const paymentUsers = await PaymentUser.find().sort({ createdAt: -1 });
    res.json(paymentUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET payment user by id
router.get("/:id", async (req, res) => {
  try {
    const paymentUser = await PaymentUser.findById(req.params.id);
    if (!paymentUser)
      return res.status(404).json({ error: "Payment user not found" });
    res.json(paymentUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE payment user
router.post("/", async (req, res) => {
  console.log("Received payment user data:", req.body);
  const { name, trip_id } = req.body; // Corrected to trip_id
  if (!name || !trip_id) {
    return res.status(400).json({ error: "Name and Trip ID are required" });
  }

  try {
    const newPaymentUser = await PaymentUser.create({ name, trip_id: trip_id });
    await Ledger.create({
      trip_id,
      payer_id: newPaymentUser._id,
      payee_id: null, // No specific payee for user creation
      amount: 0, // No amount for user creation
      currency: "N/A", // No currency for user creation
      event_description: `User ${newPaymentUser.name} (ID: ${newPaymentUser._id}) was added.`,
    });
    res.status(201).json(newPaymentUser);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error (for unique name constraint if added to schema)
      return res
        .status(409)
        .json({ error: "Payment user with this name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// UPDATE payment user
router.put("/:id", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const updatedPaymentUser = await PaymentUser.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!updatedPaymentUser)
      return res.status(404).json({ error: "Payment user not found" });
    res.json(updatedPaymentUser);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "Payment user with this name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE payment user
router.delete("/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const paymentUser = await PaymentUser.findById(userId);
    if (!paymentUser)
      return res.status(404).json({ error: "Payment user not found" });

    // Find and update expenses associated with the user
    await Expense.updateMany({ paid_by: userId }, { $set: { paid_by: null } });

    await PaymentUser.findByIdAndDelete(userId);

    await Ledger.create({
      trip_id: paymentUser.trip_id,
      payer_id: paymentUser._id,
      payee_id: null, // No specific payee for user deletion
      amount: 0, // No amount for user deletion
      currency: "N/A", // No currency for user deletion
      event_description: `User ${paymentUser.name} (ID: ${userId}) was deleted. Associated expenses are now unassigned.`,
    });

    res.json({ message: "Payment user deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
