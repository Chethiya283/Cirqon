const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies Bearer JWT signature against JWT_SECRET and attaches sanitized user to req.user
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Authentication token required.",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        message: "Access denied. Malformed authorization header.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({
        message: "Invalid token. User account does not exist.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Authentication token has expired. Please log in again.",
      });
    }
    return res.status(401).json({
      message: "Invalid authentication token.",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access forbidden. Administrator privileges required.",
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
