const express = require("express");
const { registerUser } = require("./register_user.js");

const router = express.Router();

router.post("/register", registerUser);

module.exports = router;
