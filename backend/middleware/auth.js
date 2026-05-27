const jwt = require("jsonwebtoken");
const db = require("../db");

const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      `SELECT id, name, email, phone, industry, bio,
        verification_type, verification_status, verification_notes,
        din_number, din_director_name, linkedin_url,
        succession_prev_din, succession_new_din,
        is_admin, lat, lng, city, is_active
       FROM users WHERE id = $1`,
      [decoded.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: "User not found" });
    if (!rows[0].is_active) return res.status(403).json({ error: "Account deactivated" });
    if (!rows[0].is_admin && rows[0].verification_status === "pending")
      return res.status(403).json({ error: "Account pending verification review", code: "PENDING_REVIEW" });
    if (rows[0].verification_status === "rejected")
      return res.status(403).json({ error: "Account verification rejected. Contact support.", code: "REJECTED" });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    return res.status(401).json({ error: "Invalid token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin)
    return res.status(403).json({ error: "Admin access required" });
  next();
};

module.exports = { authenticate, requireAdmin };
