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
      // Removed unique: true to allow same email with different managers
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

// Compound unique index: email + managerId for employees (allows same email with different managers)
// Sparse index allows null managerId values (for managers) to be excluded
userSchema.index({ email: 1, managerId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { role: "employee" }
});

// Unique index for managers (email must be unique for managers)
userSchema.index({ email: 1 }, { 
  unique: true, 
  partialFilterExpression: { role: "manager" } 
});

module.exports = mongoose.model("User", userSchema);
