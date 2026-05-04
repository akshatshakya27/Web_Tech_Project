const express = require("express");
const authRoutes = require("./auth");
const emissionRoutes = require("./emission");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: "EcoTrack API base route",
  });
});

router.use("/auth", authRoutes);
router.use("/emission", emissionRoutes);

module.exports = router;
