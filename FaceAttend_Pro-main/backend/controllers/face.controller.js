const {
  registerFace,
  recognizeFace
} = require("../services/face.service");

const { markAttendance } = require("./attendance.controller");

// REGISTER FACE
const register = async (req, res) => {
  try {
    const { userId, name } = req.body;
    const imagePath = req.file.path;

    const result = await registerFace(imagePath, { userId, name });

    return res.json(result);
  } catch (err) {
    console.error("FACE REGISTER ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const recognize = async (req, res) => {
  try {
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
    console.error("ATTENDANCE ERROR:", err.message);
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
