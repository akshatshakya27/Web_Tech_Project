const express = require("express");
const {
  addEmission,
  getLatestEmission,
  getEmissionHistory,
} = require("../controllers/emission");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All emission routes require authentication
router.post("/add", authenticateToken, addEmission);
router.get("/latest", authenticateToken, getLatestEmission);
router.get("/history", authenticateToken, getEmissionHistory);

module.exports = router;
