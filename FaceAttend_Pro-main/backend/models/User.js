const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: function () {
        return this.role === "manager";
      },
    },

    role: {
      type: String,
      enum: ["manager", "employee"],
      required: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "employee";
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
