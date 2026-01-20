const express = require("express");
const multer = require("multer");
const {
  register,
  recognize
} = require("../controllers/face.controller");

const router = express.Router();
const upload = multer({ dest: process.env.VERCEL ? "/tmp" : "uploads/faces/" });

// REGISTER FACE
router.post("/register", upload.single("image"), register);
console.log("REGISTER:", register);

// RECOGNIZE FACE + ATTENDANCE
router.post("/recognize", upload.single("image"), recognize);
console.log("RECOGNIZE:", recognize);

// REGISTERED FACES LIST
router.get("/registered", require("../controllers/face.controller").getRegisteredStatus);

// DELETE FACE
router.delete("/profile/:userId", require("../controllers/face.controller").deleteFace);

module.exports = router;
