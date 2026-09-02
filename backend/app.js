const express = require("express");
const cors = require("cors");
const pool = require("./db");
const propertiesRouter = require("./routes/properties");
const requestLogger = require("./middleware/requestLogger");

/**
 * Builds the Express app without starting a server.
 *
 * This is split out from server.js so tests can hand the app straight to
 * Supertest. If app.listen() ran at import time, every test file would bind a
 * real TCP port — they'd collide with each other and with a running dev server,
 * and Jest would hang at the end because an open socket keeps the process alive.
 * server.js is now the only place that listens.
 */
const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/properties", propertiesRouter);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(500).json({ status: "error", database: "disconnected", error: err.message });
  }
});

module.exports = app;
