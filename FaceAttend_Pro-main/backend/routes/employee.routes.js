const express = require("express");
const router = express.Router();
const User = require("../models/User");

// GET all employees (excluding managers)
router.get("/", async (req, res) => {
  try {
    const { managerId } = req.query;
    const filter = { role: "employee" };
    if (managerId) filter.managerId = managerId;

    const employees = await User.find(filter).select(
      "name email"
    );

    res.json({
      success: true,
      data: employees,
    });
  } catch (err) {
    console.error("EMPLOYEE LIST ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
