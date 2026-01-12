const mongoose = require("mongoose");

const faceProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    descriptor: {
      type: [Number],
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FaceProfile", faceProfileSchema);
