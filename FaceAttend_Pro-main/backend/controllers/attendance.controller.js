const Attendance = require("../models/Attendance");
const faceService = require("../services/face.service");
const User = require("../models/User");
const ExcelJS = require("exceljs");

// 🕒 CONSTANTS
const LATE_THRESHOLD = "10:30:00"; // 10:30 PM (Per user request? User said 10:30 PM, but usually it's AM. User: "10:30 PM". Wait, "10:30 PM" checkin is very late. 
// User prompt: "Employee checks in on or before 10:30 PM". 
// "Half Day Leave – First Half: Employee checks in after 10:30 PM".
// "Half Day Leave – Second Half: Employee checks out before 6:30 PM".
// 6:30 PM is 18:30. 10:30 PM is 22:30.
// This is an unusual shift (Night shift?). 
// OR did the user mean 10:30 AM?
// "Full Day Present: In <= 10:30 PM AND Out >= 6:30 PM".
// If shift starts at 10:30 PM and ends at 6:30 PM (next day?), that's a night shift.
// BUT User said: "attendance should be calculated date-wise".
// If it's date-wise, 10:30 PM to 6:30 PM (next day) spans two dates.
// VS "10:30 AM".
// Let's assume the user meant 10:30 AM (Morning) for a standard day shift.
// "Checks in on or before 10:30 PM" meant 10:30 AM likely.
// I will use 10:30 (10:30:00) and 18:30 (06:30:00 PM) as requested, interpreting "PM" as a typo for AM if it's a day job, OR strictly following "22:30" if night.
// Given "Checks out on or after 6:30 PM" (18:30), if In was 10:30 PM (22:30), In > Out.
// I'll assume standard office hours: 10:30 AM start, 6:30 PM end.
// Standards: 10:30 -> 10:30:00. 6:30 PM -> 18:30:00.

// 🕒 HELPER: Get Local Date "YYYY-MM-DD" in IST (Asia/Kolkata)
const getLocalDate = () => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("/")
    .reverse()
    .join("-");
};

// 🕒 HELPER: Get current time "HH:mm:ss" in IST (24h)
const getCurrentTimeIST = () => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
};

const START_TIME_LIMIT = "10:30:00"; // 10:30 AM
const EARLY_OUT_LIMIT = "18:30:00";  // 06:30 PM
const ABSENT_TIME_LIMIT = "19:00:00";  // 07:00 PM

// 🛠️ HELPER: Convert "HH:mm:ss" to minutes for safe comparison
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string" || timeStr === "0") return -1;

  const isPM = timeStr.toLowerCase().includes("pm");
  const isAM = timeStr.toLowerCase().includes("am");

  // Remove am/pm for parsing
  const cleanTime = timeStr.replace(/(am|pm)/gi, "").trim();
  const parts = cleanTime.split(":");
  if (parts.length < 2) return -1;

  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  // Convert 12h to 24h if AM/PM is present
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  // If no AM/PM, but user meant 24h (e.g. "19:06"), h is already 19.
  return h * 60 + m;
};

/**
 * 🧠 CALCULATE STATUS LOGIC
 */
const calculateDailyStatus = (checkIn, checkOut) => {
  if (!checkIn) return { status: "Absent", leaveType: "Full Day" };

  const inMins = timeToMinutes(checkIn);
  const outMins = checkOut ? timeToMinutes(checkOut) : null;
  const limitMins = timeToMinutes(START_TIME_LIMIT);
  const earlyOutMins = timeToMinutes(EARLY_OUT_LIMIT);
  const absentLimitMins = timeToMinutes(ABSENT_TIME_LIMIT);

  console.log(`DEBUG: In=${checkIn}(${inMins}), Out=${checkOut}(${outMins}), Thresholds: Late=${limitMins}, Early=${earlyOutMins}, Absent=${absentLimitMins}`);

  // 🔴 USER REQUEST: If check-in is after 7:00 PM (or exactly 7:00 PM), mark as Absent
  if (inMins >= absentLimitMins) {
    return { status: "Absent", leaveType: "Absent" };
  }

  let status = "Present";
  let leaveType = "None";

  const isLateIn = inMins > limitMins;
  const isEarlyOut = outMins !== null && outMins < earlyOutMins;

  // 1. Full Day Leave
  if (isLateIn && isEarlyOut) {
    status = "Absent";
    leaveType = "Absent";
    return { status, leaveType };
  }

  // 2. First Half Leave
  if (isLateIn) {
    status = "On half day leave";
    leaveType = "Half Day (First)";
  }

  // 3. Second Half Leave
  else if (isEarlyOut) {
    status = "On half day leave";
    leaveType = "Half Day (Second)";
  }

  return { status, leaveType };
};


exports.markAttendanceByFace = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const result = await faceService.recognizeFace(req.file.path);

    if (!result.matched) {
      return res.status(404).json({ success: false, message: "No such face registered" });
    }

    const today = getLocalDate();
    // ✅ FORCE 24H FORMAT in IST: "HH:mm:ss"
    const now = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());

    let attendance = await Attendance.findOne({
      userId: result.userId,
      date: today,
    });

    // ✅ FIRST SCAN → CHECK IN
    if (!attendance) {
      await Attendance.create({
        userId: result.userId,
        date: today,
        checkInTime: now,
        checkOutTime: null,
        status: "IN",
        markedBy: "face-scan",
      });

      const { status: calculatedStatus } = calculateDailyStatus(now, null);
      const displayMsg = calculatedStatus === "Absent" ? "Check-in (Absent)" : "Check-in successful";

      return res.json({
        success: true,
        type: "IN",
        message: displayMsg,
        time: now,
        name: result.name
      });
    }

    // ❌ BLOCK OUT WITHOUT IN (Should accept multiple scans? Maybe just update checkout?)
    // Basic logic: If already OUT, prevent? Or allow update? 
    // User flow: Check In -> Check Out.
    // If scanning again after OUT, maybe ignore or update checkout? 
    // Let's allow updating Checkout time (e.g. forgot something, came back, left again).
    // BUT typically: In -> Out. Done.
    if (attendance.status === "OUT") {
      // Optional: Allow re-scanning to update Check-out time?
      // For now, strict IN -> OUT.
      return res.json({
        success: false,
        message: "Already checked out today",
      });
    }

    // ✅ SECOND SCAN → CHECK OUT
    attendance.checkOutTime = now;
    attendance.status = "OUT";
    await attendance.save();

    return res.json({
      success: true,
      type: "OUT",
      message: "Check-out successful",
      time: now,
      name: result.name
    });
  } catch (err) {
    console.error("SCAN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



/**
 * 📅 HISTORY PAGE → GET ATTENDANCE BY DATE
 */
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date, managerId } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date required" });
    }

    // 1. Build filter
    const filter = { date };
    if (managerId) {
      const employees = await User.find({ managerId }).select("_id");
      filter.userId = { $in: employees.map(e => e._id) };
    }

    const records = await Attendance.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: 1 });

    const formatted = records.map((r) => {
      const { status: statusText, leaveType } = calculateDailyStatus(r.checkInTime, r.checkOutTime);

      // If user is currently "IN" (no checkout yet), simplistic status might be "Present" (in progress)
      // or "Half Day" logic cannot be fully applied for 2nd half yet.
      // But we can apply 1st half logic.

      let finalStatus = statusText;
      if (r.status === "IN") {
        if (statusText === "Absent") {
          finalStatus = "Absent";
        } else {
          finalStatus = "IN"; // Show "IN" instead of evaluating half-day logic while working
        }
      }

      return {
        _id: r._id,
        user: r.userId,
        checkIn: r.checkInTime || "--",
        checkOut: r.checkOutTime || "--",
        status: finalStatus,
        leaveType: leaveType
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("ATTENDANCE HISTORY ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { managerId } = req.query;
    const userFilter = { role: "employee" };
    if (managerId) userFilter.managerId = managerId;

    const employees = await User.find(userFilter);
    const employeeIds = employees.map(e => e._id);

    const attendance = await Attendance.find({ userId: { $in: employeeIds } });

    const summary = employees.map((emp) => {
      const empRecords = attendance.filter(
        (a) => a.userId.toString() === emp._id.toString()
      );

      let presentCount = 0;
      let absentCount = 0;

      empRecords.forEach((r) => {
        const { leaveType } = calculateDailyStatus(
          r.checkInTime,
          r.checkOutTime
        );

        // USER REQUEST: Only Present vs Full-Day Absent
        // Half-day leaves (late in or early out) now count as Present.
        if (leaveType === "Absent") {
          absentCount++;
        } else {
          presentCount++;
        }
      });

      return {
        userId: emp._id,
        present: presentCount,
        absent: absentCount,
      };
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error("ATTENDANCE SUMMARY ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAttendanceByEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const records = await Attendance.find({ userId: id }).sort({ date: -1 });

    const formatted = records.map(r => {
      const { status: statusText } = calculateDailyStatus(r.checkInTime, r.checkOutTime);
      let finalStatus = statusText;
      if (r.status === "IN") {
        if (statusText === "Absent") finalStatus = "Absent";
        else finalStatus = "IN";
      }

      return {
        _id: r._id,
        date: r.date,
        checkIn: r.checkInTime || "--",
        checkOut: r.checkOutTime || "--",
        status: finalStatus, // Use computed status
        originalStatus: r.status // IN/OUT
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("EMPLOYEE ATTENDANCE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ... existing getTodayStats ...
exports.getTodayStats = async (req, res) => {
  try {
    const { managerId } = req.query;
    const today = getLocalDate();

    const userFilter = { role: "employee" };
    if (managerId) userFilter.managerId = managerId;

    const employees = await User.find(userFilter);
    const employeeIds = employees.map(e => e._id);

    const totalEmployees = employees.length;
    const todayAttendance = await Attendance.find({
      date: today,
      userId: { $in: employeeIds }
    });

    let presentCount = 0;
    let outCount = 0;

    todayAttendance.forEach(a => {
      const { status: calculatedStatus, leaveType } = calculateDailyStatus(a.checkInTime, a.checkOutTime);

      // If they are marked 'Absent' (e.g. checked in after 7 PM), don't count as present in stats
      if (calculatedStatus !== "Absent") {
        presentCount++;
      }

      if (a.status === "OUT") {
        outCount++;
      }
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        present: presentCount,
        out: outCount,
      },
    });
  } catch (err) {
    console.error("STATS ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ... existing getTodayExceptions ...
exports.getTodayExceptions = async (req, res) => {
  try {
    const today = getLocalDate();
    const targetDate = req.query.date || today;
    const { managerId } = req.query;

    const userFilter = { role: "employee" };
    if (managerId) userFilter.managerId = managerId;

    const employees = await User.find(userFilter);
    const employeeIds = employees.map(e => e._id);

    const attendance = await Attendance.find({
      date: targetDate,
      userId: { $in: employeeIds }
    });

    // ✅ Get current time in IST for comparison
    const nowIST = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());

    const nowMins = timeToMinutes(nowIST);

    const attendanceMap = {};
    attendance.forEach((a) => {
      attendanceMap[a.userId.toString()] = a;
    });

    const result = employees
      .map((emp) => {
        const record = attendanceMap[emp._id.toString()];

        // 1. If no record exists
        if (!record) {
          // ✅ IMPROVED: If it's a past date OR today and past 10:30 AM, show as Absent
          const startTimeMins = timeToMinutes(START_TIME_LIMIT);
          if (targetDate < today || (targetDate === today && nowMins > startTimeMins)) {
            return { name: emp.name, type: "Absent" };
          }
          return null;
        }

        const { status: calculatedStatus, leaveType } = calculateDailyStatus(
          record.checkInTime,
          record.checkOutTime
        );

        // 2. If session is still active ("IN")
        if (record.status === "IN") {
          // Rule 3: Any employee checked in after 7:00 pm immediately show absent
          if (calculatedStatus === "Absent") {
            return { name: emp.name, type: "Absent" };
          }

          // ✅ NEW: Show half-day even if they haven't checked out yet
          if (leaveType !== "None") {
            return { name: emp.name, type: leaveType };
          }

          return null;
        }

        // 3. If session is complete ("OUT")
        // Rule 1: Evaluates after checkout for Late In / Early Out
        if (leaveType !== "None") {
          return { name: emp.name, type: leaveType };
        }

        return null; // Present and on time
      })
      .filter(Boolean);

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("GET EXCEPTIONS ERROR (DETAILED):", err);
    res.status(500).json({ success: false, message: "Error" });
  }
};

/**
 * 📥 EXPORT ATTENDANCE TO EXCEL
 */
exports.exportAttendance = async (req, res) => {
  try {
    const { date, managerId } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date required" });
    }

    const filter = { date };
    if (managerId) {
      const employees = await User.find({ managerId }).select("_id");
      filter.userId = { $in: employees.map(e => e._id) };
    }

    const records = await Attendance.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Attendance ${date}`);

    // Define Columns
    worksheet.columns = [
      { header: "No.", key: "no", width: 5 },
      { header: "Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Date", key: "date", width: 15 },
      { header: "Check-In", key: "checkIn", width: 15 },
      { header: "Check-Out", key: "checkOut", width: 15 },
      { header: "Status", key: "status", width: 20 },
      { header: "Leave Type", key: "leaveType", width: 15 },
    ];

    // Add Data
    records.forEach((r, index) => {
      const { status: statusText, leaveType } = calculateDailyStatus(
        r.checkInTime,
        r.checkOutTime
      );

      let finalStatus = statusText;
      if (r.status === "IN") {
        if (statusText === "Absent") {
          finalStatus = "Absent";
        } else {
          finalStatus = "IN";
        }
      }

      worksheet.addRow({
        no: index + 1,
        name: r.userId?.name || "Unknown",
        email: r.userId?.email || "N/A",
        date: r.date,
        checkIn: r.checkInTime || "--",
        checkOut: r.checkOutTime || "--",
        status: finalStatus,
        leaveType: leaveType || "None",
      });
    });

    // Style Header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" }, // Primary Blue
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Response Headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Attendance_${date}.xlsx`
    );

    // Write to stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ MANUAL CHECK-IN (Web)
 * Body: { userId: "<employeeId>" }
 * NOTE: Prevents multiple check-ins for the same user on the same date.
 */
exports.manualCheckIn = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    const today = getLocalDate();
    const now = getCurrentTimeIST();

    // Check if already has an attendance record for today
    const existing = await Attendance.findOne({ userId, date: today });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Already checked in today",
      });
    }

    const record = await Attendance.create({
      userId,
      date: today,
      checkInTime: now,
      checkOutTime: null,
      status: "IN",
      markedBy: "manual",
    });

    return res.json({
      success: true,
      type: "IN",
      message: "Manual check-in successful",
      time: record.checkInTime,
    });
  } catch (err) {
    console.error("MANUAL CHECK-IN ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * ✅ MANUAL CHECK-OUT (Web)
 * Body: { userId: "<employeeId>" }
 */
exports.manualCheckOut = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    const today = getLocalDate();
    const now = getCurrentTimeIST();

    const attendance = await Attendance.findOne({ userId, date: today });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No check-in found for today",
      });
    }

    if (attendance.status === "OUT") {
      return res.status(409).json({
        success: false,
        message: "Already checked out today",
      });
    }

    attendance.checkOutTime = now;
    attendance.status = "OUT";
    attendance.markedBy = "manual";
    await attendance.save();

    return res.json({
      success: true,
      type: "OUT",
      message: "Manual check-out successful",
      time: attendance.checkOutTime,
    });
  } catch (err) {
    console.error("MANUAL CHECK-OUT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
