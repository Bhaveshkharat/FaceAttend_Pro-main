const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const {
  markAttendanceByFace,
  getAttendanceByDate,
  getAttendanceSummary,
  getAttendanceByEmployee,
  getTodayStats,
  getTodayExceptions,
} = require("../controllers/attendance.controller");

router.post("/scan", upload.single("image"), markAttendanceByFace);
router.get("/", getAttendanceByDate);
router.get("/summary", getAttendanceSummary);
router.get("/employee/:id", getAttendanceByEmployee);
router.get("/stats/today", getTodayStats);
router.get("/exceptions/today", getTodayExceptions);
router.get("/export", require("../controllers/attendance.controller").exportAttendance);

module.exports = router;


