const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");





exports.registerManager = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Normalize inputs
    email = email.toLowerCase().trim();
    name = name.trim();

    console.log("Registering manager:", email);

    const exists = await User.findOne({ email });
    if (exists) {
      console.log("Manager registration failed: User already exists", exists.role);
      return res.status(400).json({ message: "Manager already exists" });
    }

    // ✅ HASH PASSWORD (CRITICAL)
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "manager",
    });

    console.log("Manager registered successfully:", user._id);
    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("REGISTER MANAGER ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

exports.registerEmployee = async (req, res) => {
  try {
    let { name, email, managerId } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    if (!managerId) {
      return res.status(400).json({
        message: "Manager ID is required",
      });
    }

    // Normalize
    email = email.toLowerCase().trim();
    name = name.trim();

    // Check if employee already exists with same email AND managerId
    // This allows same email to register with different managers
    const exists = await User.findOne({ email, managerId, role: "employee" });
    if (exists) {
      return res.status(400).json({
        message: "Employee already registered with this manager",
      });
    }

    // Check if email is already used by a manager (managers must have unique emails)
    const managerExists = await User.findOne({ email, role: "manager" });
    if (managerExists) {
      return res.status(400).json({
        message: "This email is already registered as a manager",
      });
    }

    const user = await User.create({
      name,
      email,
      role: "employee",
      managerId: managerId,
    });

    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        managerId: user.managerId,
      },
    });
  } catch (err) {
    console.error("REGISTER EMPLOYEE ERROR:", err);
    
    // Handle duplicate key error (from compound unique index)
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Employee already registered with this manager",
      });
    }
    
    return res.status(500).json({
      message: "Employee registration failed",
    });
  }
};


exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    email = email.toLowerCase().trim();
    console.log("Login attempt for:", email);

    const user = await User.findOne({ email });

    if (!user) {
      console.log("Login failed: User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role !== "manager") {
      console.log("Login failed: User exists but role is not manager. Role:", user.role);
      return res.status(401).json({ message: "Invalid credentials (Role mismatch)" });
    }

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("Login failed: Password mismatch for user:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Login success:", email);
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

