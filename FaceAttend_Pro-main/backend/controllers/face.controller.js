const {
  registerFace,
  recognizeFace
} = require("../services/face.service");

const { markAttendance } = require("./attendance.controller");

// REGISTER FACE
const register = async (req, res) => {
  try {
    console.log("REGISTER REQUEST RECEIVED");
    console.log("Body:", req.body);
    console.log("File:", req.file);

    if (!req.file) {
      console.error("REGISTER ERROR: No file uploaded");
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    const { userId, name } = req.body;
    const imagePath = req.file.path;

    const result = await registerFace(imagePath, userId);

    return res.json(result);
  } catch (err) {
    console.error("FACE REGISTER ERROR:", err);

    // 🧹 CLEANUP: If face registration fails (e.g. duplicate), delete the user record
    // that was created in the previous step.
    try {
      const User = require("../models/User");
      const { userId } = req.body;
      if (userId) {
        console.log(`Cleaning up User ${userId} due to face registration failure...`);
        await User.findByIdAndDelete(userId);
      }
    } catch (cleanupErr) {
      console.error("CLEANUP ERROR:", cleanupErr);
    }

    return res.status(500).json({ success: false, message: err.message });
  }
};

const recognize = async (req, res) => {
  try {
    console.log("RECOGNIZE REQUEST RECEIVED");
    console.log("File:", req.file);

    if (!req.file) {
      console.error("RECOGNIZE ERROR: No file uploaded");
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    const imagePath = req.file.path;
    const result = await recognizeFace(imagePath);

    if (!result.matched) {
      return res.json({
        success: true,
        matched: false,
        message: result.message || "Face not recognized"
      });
    }

    const attendanceResult = await markAttendance({
      userId: result.userId,
      name: result.name
    });

    return res.json({
      success: true,
      matched: true,
      type: attendanceResult.type,
      message: attendanceResult.message
    });

  } catch (err) {
    console.error("ATTENDANCE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};




module.exports = {
  register,
  recognize
};
