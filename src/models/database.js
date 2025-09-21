const sqlite3 = require("sqlite3").verbose();

const DB_PATH = process.env.DB_PATH || "./database.sqlite";

let db = null;

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database:", err.message);
        reject(err);
      } else {
        console.log("Connected to SQLite database");
        db.run("PRAGMA foreign_keys = ON;", (pragmaErr) => {
          if (pragmaErr) {
            console.error("Error enabling foreign key enforcement:", pragmaErr.message);
            reject(pragmaErr);
          } else {
            console.log("Foreign key enforcement enabled.");
            createTables()
              .then(() => resolve())
              .catch(reject);
          }
        });
      }
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const queries = [
      `CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_of_stay TEXT NOT NULL,
        check_in_date TEXT NOT NULL,
        check_out_date TEXT NOT NULL,
        travel_mode TEXT NOT NULL,
        number_of_people INTEGER,
        budget INTEGER,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        estimated_duration INTEGER,
        notes TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS day_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id INTEGER,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS day_plan_places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_plan_id INTEGER,
        place_id INTEGER,
        start_time TEXT,
        end_time TEXT,
        order_index INTEGER,
        travel_time_to_next INTEGER,
        FOREIGN KEY (day_plan_id) REFERENCES day_plans (id) ON DELETE CASCADE,
        FOREIGN KEY (place_id) REFERENCES places (id) ON DELETE CASCADE
      )`,
    ];

    let completed = 0;
    queries.forEach((q) => {
      db.run(q, (err) => {
        if (err) {
          console.error("Error creating table:", err.message);
          reject(err);
        } else {
          completed++;
          if (completed === queries.length) {
            insertSampleData().then(resolve).catch(reject);
          }
        }
      });
    });
  });
};

const insertSampleData = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM trips", (err, row) => {
      if (err) return reject(err);
      if (row.count > 0) return resolve();

      const insertTrip = `INSERT INTO trips (location_of_stay, check_in_date, check_out_date, travel_mode, number_of_people, budget, description)
                          VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.run(
        insertTrip,
        [
          "Hotel Taj, Mumbai",
          "2025-10-15",
          "2025-10-18",
          "flight",
          4,
          75000,
          "Family trip to Mumbai",
        ],
        function (err) {
          if (err) return reject(err);

          const places = [
            [
              "Gateway of India",
              "historical",
              90,
              "Iconic monument overlooking the Arabian Sea",
              "Apollo Bandar, Colaba, Mumbai",
            ],
            [
              "Marine Drive",
              "nature",
              60,
              "Beautiful seaside promenade",
              "Marine Drive, Mumbai",
            ],
            [
              "Chhatrapati Shivaji Terminus",
              "historical",
              45,
              "UNESCO World Heritage railway station",
              "Fort, Mumbai",
            ],
          ];
          const stmt = db.prepare(
            "INSERT INTO places (name, category, estimated_duration, notes, address) VALUES (?, ?, ?, ?, ?)"
          );
          let i = 0;
          const insertNext = () => {
            if (i >= places.length) {
              resolve();
              return;
            }
            stmt.run(places[i], (err) => {
              if (err) return reject(err);
              i++;
              insertNext();
            });
          };
          insertNext();
        }
      );
    });
  });
};

const getDatabase = () => {
  if (!db) throw new Error("Database not initialized");
  return db;
};

const closeDatabase = () => {
  return new Promise((resolve) => {
    if (db) {
      db.close(() => resolve());
    } else {
      resolve();
    }
  });
};

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
};
