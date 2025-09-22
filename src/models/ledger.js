const { getDatabase } = require("../models/database");

const addLedgerEntry = (description) => {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO ledger_entries (event_description) VALUES (?)`;
    db.run(query, [description], function (err) {
      if (err) {
        console.error("Error adding ledger entry:", err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID });
      }
    });
  });
};

const getAllLedgerEntries = () => {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ledger_entries ORDER BY timestamp DESC`;
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error fetching ledger entries:", err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  addLedgerEntry,
  getAllLedgerEntries,
};