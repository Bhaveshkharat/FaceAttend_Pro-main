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
// Safer masking: Keep the protocol and host, hide user:pass
const uri = process.env.MONGO_URI || "";
const maskedUri = uri.includes("@")
  ? uri.split("@")[0].replace(/(\/\/)(.*):(.*)/, "$1****:****") + "@" + uri.split("@")[1]
  : "UNDEFINED or INVALID";

console.log(`📡 Connecting to MongoDB URI: ${maskedUri}`);

mongoose
  .connect(uri, {
    serverSelectionTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 45000, // 45 seconds
    socketTimeoutMS: 60000, // 1 minute
    family: 4, // Force IPv4
    tls: true, // Explicitly enable TLS for Atlas
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:");
    console.error(err.message);
    if (err.message.includes("replica set")) {
      console.log("💡 Tip: Common fixes for 'replica set' errors on Render:");
      console.log("   1. Whitelist 0.0.0.0/0 in MongoDB Atlas -> Network Access.");
      console.log("   2. If using a standalone DB, add ?retryWrites=false to your MONGO_URI.");
    }
  });

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
