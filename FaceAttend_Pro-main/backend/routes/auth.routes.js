const express = require("express");
const router = express.Router();
const {
  registerManager,
  registerEmployee,
  login,
} = require("../controllers/auth.controller");

router.post("/register-manager", registerManager);


router.post("/register-employee", registerEmployee);
router.post("/login", login);

module.exports = router;
