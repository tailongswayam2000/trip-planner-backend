const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const connectDB = require("./src/config/db");
const tripRoutes = require("./src/routes/trips");
const placeRoutes = require("./src/routes/places");
const itineraryRoutes = require("./src/routes/itinerary");
const paymentUserRoutes = require("./src/routes/paymentUsers");
const expenseRoutes = require("./src/routes/expenses");
const ledgerRoutes = require("./src/routes/ledger");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/trips", tripRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/itinerary", itineraryRoutes);
app.use("/api/payment_users", paymentUserRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/ledger", ledgerRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Trip Planner API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const startServer = async () => {
  try {
    await connectDB();
    console.log("Database initialized successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
