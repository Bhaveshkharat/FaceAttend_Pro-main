const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    checkInTime: {
      type: String, // HH:mm:ss am/pm
      default: "0",
    },
    checkOutTime: {
      type: String, // HH:mm:ss am/pm
      default: "0",
    },
    status: {
      type: String,
      enum: ["IN", "OUT"],
      default: "IN",
    },
    markedBy: {
      type: String,
      default: "face-scan",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
