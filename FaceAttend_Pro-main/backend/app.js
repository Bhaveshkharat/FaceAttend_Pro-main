const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const faceRoutes = require("./routes/face.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const authRoutes = require("./routes/auth.routes");
const faceService = require("./services/face.service");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);
// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"), { dbName: "attendance_manager" })
  .catch((err) => console.error("❌ MongoDB error:", err));

// Routes
app.use("/api/face", faceRoutes);
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/employees", require("./routes/employee.routes"));

// Health check
app.get("/", (req, res) => {
  res.send("Face Attendance Backend is running");
});

// ⚡ PRELOAD AI MODELS
faceService.preloadModels();

module.exports = app;
