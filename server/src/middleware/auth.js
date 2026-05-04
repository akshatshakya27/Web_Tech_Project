const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify token with JWT_SECRET
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Token is invalid or expired",
        });
      }

      // Attach decoded user to request object
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication",
    });
  }
};

module.exports = {
  authenticateToken,
};
