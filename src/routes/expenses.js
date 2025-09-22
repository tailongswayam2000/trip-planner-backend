const express = require("express");
const router = express.Router();
const Expense = require("../models/mongo/Expense");
const PaymentUser = require("../models/mongo/PaymentUser");
const Place = require("../models/mongo/Place");
const Ledger = require("../models/mongo/Ledger");

// GET all expenses
router.get("/", async (req, res) => {
  try {
    const { tripId } = req.query;
    const query = tripId ? { trip_id: tripId } : {};
    const expenses = await Expense.find(query)
      .populate("paid_by", "name _id")
      .populate("place_id", "name")
      .sort({ payment_time: -1 });

    const formattedExpenses = expenses.map((expense) => ({
      ...expense.toObject(),
      paymentUserName: expense.paid_by ? expense.paid_by.name : null,
      placeName: expense.place_id ? expense.place_id.name : null,
      modeOfPayment: expense.mode_of_payment,
    }));

    res.json(formattedExpenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET expense by id
router.get("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("paid_by", "name")
      .populate("place_id", "name");
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    const formattedExpense = {
      ...expense.toObject(),
      paymentUserName: expense.paid_by ? expense.paid_by.name : null,
      placeName: expense.place_id ? expense.place_id.name : null,
      modeOfPayment: expense.mode_of_payment,
    };
    res.json(formattedExpense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE expense
router.post("/", async (req, res) => {
  const {
    tripId,
    amount,
    paymentUserId,
    description,
    modeOfPayment = "UPI",
    placeId,
    paymentTime = new Date().toISOString(),
  } = req.body;

  if (!tripId || !amount) {
    return res.status(400).json({ error: "Trip ID and amount are required" });
  }

  try {
    const newExpense = await Expense.create({
      trip_id: tripId,
      amount,
      paid_by: paymentUserId === "" ? null : paymentUserId,
      description,
      mode_of_payment: modeOfPayment,
      place_id: placeId === "" ? null : placeId,
      payment_time: paymentTime,
    });

    const populatedExpense = await Expense.findById(newExpense._id)
      .populate("paid_by", "name")
      .populate("place_id", "name");

    const payerName = populatedExpense.paid_by
      ? populatedExpense.paid_by.name
      : "N/A";
    const placeName = populatedExpense.place_id
      ? populatedExpense.place_id.name
      : "N/A";

    await Ledger.create({
      trip_id: tripId,
      payer_id: paymentUserId === "" ? null : paymentUserId,
      payee_id: null, // Assuming payee is not directly set on expense creation
      amount: amount,
      currency: populatedExpense.currency, // Assuming currency is set in Expense model default
      event_description: `Expense of Rs.${amount} for '${
        description || "No description"
      }' was added by ${payerName} (Mode: ${modeOfPayment}) on ${new Date(
        paymentTime
      ).toLocaleString()} and linked to ${placeName}.`,
    });

    res.status(201).json({
      ...populatedExpense.toObject(),
      paymentUserName: payerName,
      placeName: placeName,
      modeOfPayment: populatedExpense.mode_of_payment,
    });
  } catch (err) {
    console.error("Error creating expense:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE expense
router.put("/:id", async (req, res) => {
  const {
    tripId,
    amount,
    paymentUserId,
    description,
    modeOfPayment,
    placeId,
    paymentTime,
  } = req.body;

  if (!tripId || !amount) {
    return res.status(400).json({ error: "Trip ID and amount are required" });
  }

  try {
    const originalExpense = await Expense.findById(req.params.id);
    if (!originalExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        trip_id: tripId,
        amount,
        paid_by: paymentUserId === "" ? null : paymentUserId,
        description,
        mode_of_payment: modeOfPayment,
        place_id: placeId === "" ? null : placeId,
        payment_time: paymentTime,
      },
      { new: true, runValidators: true }
    )
      .populate("paid_by", "name")
      .populate("place_id", "name");

    if (!updatedExpense)
      return res.status(404).json({ error: "Expense not found" });

    const payerName = updatedExpense.paid_by
      ? updatedExpense.paid_by.name
      : "N/A";
    const placeName = updatedExpense.place_id
      ? updatedExpense.place_id.name
      : "N/A";

    // Create a more detailed ledger entry for the update
    let event_description = `Expense with ID ${updatedExpense._id} was updated.\n`;
    const original = originalExpense.toObject();
    const updated = updatedExpense.toObject();

    const changedFields = Object.keys(updated).filter((key) => {
      if (key === "paid_by" || key === "place_id") {
        // Handle ObjectId comparison
        return (
          original[key] &&
          updated[key] &&
          original[key].toString() !== updated[key].toString()
        );
      }
      return original[key] !== updated[key];
    });

    changedFields.forEach((field) => {
      event_description += `  - ${field}: from '${original[field]}' to '${updated[field]}'\n`;
    });

    if (changedFields.length === 0) {
      event_description += "No fields were changed.";
    }

    await Ledger.create({
      trip_id: tripId,
      payer_id: paymentUserId === "" ? null : paymentUserId,
      payee_id: null,
      amount: amount,
      currency: updatedExpense.currency,
      event_description: event_description,
    });

    res.json({
      ...updatedExpense.toObject(),
      paymentUserName: payerName,
      placeName: placeName,
      modeOfPayment: updatedExpense.mode_of_payment,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE expense
router.delete("/:id", async (req, res) => {
  const expenseId = req.params.id;
  try {
    const expenseDetails = await Expense.findById(expenseId)
      .populate("paid_by", "name")
      .populate("place_id", "name");

    if (!expenseDetails)
      return res.status(404).json({ error: "Expense not found" });

    await Expense.findByIdAndDelete(expenseId);

    const payerName = expenseDetails.paid_by
      ? expenseDetails.paid_by.name
      : "N/A";
    const placeName = expenseDetails.place_id
      ? expenseDetails.place_id.name
      : "N/A";

    await Ledger.create({
      trip_id: expenseDetails.trip_id,
      payer_id: expenseDetails.paid_by ? expenseDetails.paid_by._id : null,
      payee_id: null, // Assuming payee is not directly set on expense deletion
      amount: expenseDetails.amount,
      currency: expenseDetails.currency,
      event_description: `Expense of Rs.${expenseDetails.amount} for '${
        expenseDetails.description || "No description"
      }' paid by ${payerName} (Mode: ${
        expenseDetails.mode_of_payment
      }) on ${new Date(
        expenseDetails.payment_time
      ).toLocaleString()} and linked to ${placeName} was deleted.`,
    });

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
