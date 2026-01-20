const {
  registerFace,
  recognizeFace
} = require("../services/face.service");

const User = require("../models/User");
const fs = require("fs");

const { markAttendance } = require("./attendance.controller");

// REGISTER FACE
const register = async (req, res) => {
  let userIdToCleanup = null;
  let imagePathToCleanup = null;

  try {
    console.log("--- FACE REGISTER START ---");
    console.log("Body:", req.body);
    console.log("File:", req.file);

    if (!req.file) {
      console.error("REGISTER ERROR: No file uploaded");
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    const { userId, name } = req.body;
    const imagePath = req.file.path;

    userIdToCleanup = userId;
    imagePathToCleanup = imagePath;

    console.log(`Processing registration for User: ${userId}, Name: ${name}`);

    const result = await registerFace(imagePath, userId);

    console.log("--- FACE REGISTER SUCCESS ---");
    return res.json(result);
  } catch (err) {
    console.error("--- FACE REGISTER FAILURE ---");
    console.error("Error Message:", err.message);

    // 🧹 CLEANUP 1: Delete the user record from MongoDB
    if (userIdToCleanup) {
      try {
        console.log(`🧹 CLEANUP: Deleting User record ${userIdToCleanup} from MongoDB...`);
        const deleteRes = await User.findByIdAndDelete(userIdToCleanup);
        console.log(`🧹 CLEANUP: User record deleted:`, !!deleteRes);
      } catch (cleanupErr) {
        console.error("🧹 CLEANUP ERROR (MongoDB):", cleanupErr.message);
      }
    }

    // 🧹 CLEANUP 2: Delete the uploaded image file
    if (imagePathToCleanup) {
      try {
        if (fs.existsSync(imagePathToCleanup)) {
          console.log(`🧹 CLEANUP: Deleting temporary file ${imagePathToCleanup}...`);
          fs.unlinkSync(imagePathToCleanup);
        }
      } catch (fileErr) {
        console.error("🧹 CLEANUP ERROR (File):", fileErr.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Face registration failed"
    });
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




const getRegisteredStatus = async (req, res) => {
  try {
    const { managerId } = req.query;
    const { getRegisteredFaces } = require("../services/face.service");

    let userIds = await getRegisteredFaces();

    if (managerId) {
      const myEmployees = await User.find({ managerId }).select("_id");
      const myEmployeeIds = myEmployees.map(e => e._id.toString());
      userIds = userIds.filter(uid => myEmployeeIds.includes(uid));
    }

    return res.json({ success: true, registeredUserIds: userIds });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteFace = async (req, res) => {
  try {
    const { userId } = req.params;
    const { deleteFace: removeFace } = require("../services/face.service");
    const result = await removeFace(userId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register,
  recognize,
  getRegisteredStatus,
  deleteFace
};
