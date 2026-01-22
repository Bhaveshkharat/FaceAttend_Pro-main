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
  exportAttendance,
  manualCheckIn,
  manualCheckOut,
} = require("../controllers/attendance.controller");

router.post("/scan", upload.single("image"), markAttendanceByFace);
router.post("/manual/check-in", manualCheckIn);
router.post("/manual/check-out", manualCheckOut);
router.get("/", getAttendanceByDate);
router.get("/summary", getAttendanceSummary);
router.get("/employee/:id", getAttendanceByEmployee);
router.get("/stats/today", getTodayStats);
router.get("/exceptions/today", getTodayExceptions);
router.get("/export", exportAttendance);

module.exports = router;


