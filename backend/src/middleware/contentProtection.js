// middleware/contentProtection.js
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../database/db"); // your DB connection

// ✅ 1. Verify JWT + enrollment check
const protectContent = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.query.token; // allow token in query for HLS chunks

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id || decoded.userId;
    const { courseId } = req.params;

    // 🛡️ ADMIN BYPASS: Super Admins can view any content
    // We check for common admin role IDs or permission bits if available
    const isAdmin = decoded.role_id === 'admin' || decoded.permissions >= 100; // Adjust based on your role system
    
    if (!isAdmin && courseId) {
      // Check enrollment in your DB
      const [isEnrolled] = await db.query(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'",
        [userId, courseId]
      );

      if (!isEnrolled.length) {
        return res.status(403).json({ message: "Not enrolled in this course" });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ✅ 2. Rate limit — prevent bulk chunk downloading
const chunkRateLimit = rateLimit({
  windowMs: 60 * 1000,     // 1 minute window
  max: 300,                 // max 300 chunk requests/min per user
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: "Too many requests, slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ 3. Protect image routes (lighter check, no enrollment needed for thumbnails)
const protectImage = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.query.token;

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protectContent, chunkRateLimit, protectImage };