const express = require("express");
const router = express.Router();
const { getDatabase } = require("../models/database");
const { addLedgerEntry } = require("../models/ledger");

const toCamelCase = (obj) => {
  if (!obj) return null;
  const newObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

// GET all expenses
router.get("/", (req, res) => {
  const db = getDatabase();
  const { tripId } = req.query;
  let sql = `SELECT e.*, pu.name as payment_user_name, p.name as place_name FROM expenses e
             LEFT JOIN payment_users pu ON e.payment_user_id = pu.id
             LEFT JOIN places p ON e.place_id = p.id`;
  const params = [];

  if (tripId) {
    sql += ` WHERE e.trip_id = ?`;
    params.push(tripId);
  }

  sql += ` ORDER BY e.payment_time DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(toCamelCase));
  });
});

// GET expense by id
router.get("/:id", (req, res) => {
  const db = getDatabase();
  const sql = `SELECT e.*, pu.name as payment_user_name, p.name as place_name FROM expenses e
             LEFT JOIN payment_users pu ON e.payment_user_id = pu.id
             LEFT JOIN places p ON e.place_id = p.id
             WHERE e.id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Expense not found" });
    res.json(toCamelCase(row));
  });
});

// CREATE expense
router.post("/", (req, res) => {
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

  const db = getDatabase();
  const sql = `INSERT INTO expenses (trip_id, amount, payment_user_id, description, mode_of_payment, place_id, payment_time)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(
    sql,
    [
      tripId,
      amount,
      paymentUserId === '' ? null : paymentUserId,
      description,
      modeOfPayment,
      placeId === '' ? null : placeId,
      paymentTime,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const expenseId = this.lastID;
      const selectSql = `SELECT e.*, pu.name as payment_user_name, p.name as place_name FROM expenses e
                         LEFT JOIN payment_users pu ON e.payment_user_id = pu.id
                         LEFT JOIN places p ON e.place_id = p.id
                         WHERE e.id = ?`;
      db.get(selectSql, [expenseId], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        const payerName = row.payment_user_name || "N/A";
        const placeName = row.place_name || "N/A";
        addLedgerEntry(
          `Expense of ₹${row.amount} for '${row.description || "No description"}' was added by ${payerName} (Mode: ${row.mode_of_payment}) on ${new Date(row.payment_time).toLocaleString()} and linked to ${placeName}.`
        );
        res.status(201).json(toCamelCase(row));
      });
    }
  );
});

// UPDATE expense
router.put("/:id", (req, res) => {
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

  const db = getDatabase();
  const sql = `UPDATE expenses SET trip_id=?, amount=?, payment_user_id=?, description=?, mode_of_payment=?, place_id=?, payment_time=? WHERE id=?`;
  db.run(
    sql,
    [
      tripId,
      amount,
      paymentUserId === '' ? null : paymentUserId,
      description,
      modeOfPayment,
      placeId === '' ? null : placeId,
      paymentTime,
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Expense not found" });
      db.get("SELECT * FROM expenses WHERE id = ?", [req.params.id], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(toCamelCase(row));
      });
    }
  );
});

// DELETE expense
router.delete("/:id", (req, res) => {
  const db = getDatabase();
  const expenseId = req.params.id;
  const selectSql = `SELECT e.*, pu.name as payment_user_name, p.name as place_name FROM expenses e
                     LEFT JOIN payment_users pu ON e.payment_user_id = pu.id
                     LEFT JOIN places p ON e.place_id = p.id
                     WHERE e.id = ?`;
  db.get(selectSql, [expenseId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Expense not found" });

    const expenseDetails = row;
    db.run("DELETE FROM expenses WHERE id = ?", [expenseId], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Expense not found" });
      const payerName = expenseDetails.payment_user_name || "N/A";
      const placeName = expenseDetails.place_name || "N/A";
      addLedgerEntry(
        `Expense of ₹${expenseDetails.amount} for '${expenseDetails.description || "No description"}' paid by ${payerName} (Mode: ${expenseDetails.mode_of_payment}) on ${new Date(expenseDetails.payment_time).toLocaleString()} and linked to ${placeName} was deleted.`
      );
      res.json({ message: "Expense deleted successfully" });
    });
  });
});

module.exports = router;
