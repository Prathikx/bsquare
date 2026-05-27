const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const generateTokens = (userId) => ({
  access: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }),
  refresh: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }),
});

const saveRefreshToken = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)", [userId, token, expiresAt]);
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
router.post("/register",
  [
    body("name").trim().notEmpty().withMessage("Full name is required"),
    body("businessName").trim().notEmpty().withMessage("Business name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("city").trim().notEmpty().withMessage("City is required"),
    body("lat").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude required"),
    body("lng").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude required"),
    body("verificationType").isIn(["din", "linkedin", "succession"]).withMessage("Invalid verification type"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const {
      name, businessName, email, password, phone, city, lat, lng, industry, bio,
      verificationType, dinNumber, dinDirectorName, linkedinUrl,
      successionPrevDin, successionNewDin, successionDocUrl,
    } = req.body;

    try {
      const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rows[0]) return res.status(409).json({ error: "An account with this email already exists" });

      // Validate per type
      if (verificationType === "din") {
        if (!dinNumber?.trim()) return res.status(400).json({ error: "DIN number is required" });
        if (!/^\d{8}$/.test(dinNumber.trim())) return res.status(400).json({ error: "DIN must be exactly 8 digits (e.g. 00123456)" });
        if (!dinDirectorName?.trim()) return res.status(400).json({ error: "Director name as registered with MCA is required" });
        const dinCheck = await db.query("SELECT id FROM users WHERE din_number = $1", [dinNumber.trim()]);
        if (dinCheck.rows[0]) return res.status(409).json({ error: "This DIN is already registered on B Square" });
      } else if (verificationType === "linkedin") {
        if (!linkedinUrl?.trim()) return res.status(400).json({ error: "LinkedIn profile URL is required" });
        const u = linkedinUrl.trim().toLowerCase();
        if (!u.includes("linkedin.com/in/")) return res.status(400).json({ error: "Must be a valid LinkedIn profile URL (linkedin.com/in/yourname)" });
        const parts = u.split("linkedin.com/in/");
        if (!parts[1] || parts[1].replace(/\//g, "").length < 3) return res.status(400).json({ error: "LinkedIn URL appears incomplete" });
      } else if (verificationType === "succession") {
        if (!name?.trim()) return res.status(400).json({ error: "Your full name is required" });
        if (!successionDocUrl?.trim()) return res.status(400).json({ error: "Succession document is required" });
        if (successionNewDin?.trim() && !/^\d{8}$/.test(successionNewDin.trim()))
          return res.status(400).json({ error: "New DIN must be 8 digits if provided" });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const { rows } = await db.query(
        `INSERT INTO users (
          name, email, password_hash, phone, industry, bio,
          verification_type, verification_status,
          din_number, din_director_name, linkedin_url,
          succession_prev_din, succession_new_din, succession_doc_url,
          lat, lng, city
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id, name, email, verification_type, verification_status`,
        [
          businessName.trim(), email, passwordHash, phone || null, industry || null, bio || null,
          verificationType,
          verificationType === "din" ? dinNumber.trim() : null,
          verificationType === "din" ? dinDirectorName.trim() : null,
          verificationType === "linkedin" ? linkedinUrl.trim() : null,
          successionPrevDin?.trim() || null,
          successionNewDin?.trim() || null,
          successionDocUrl?.trim() || null,
          parseFloat(lat), parseFloat(lng), city,
        ]
      );

      return res.status(201).json({
        message: "Account submitted for review. You will be notified once approved.",
        pendingReview: true,
        verificationType,
      });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  }
);

// ─── LOGIN ───────────────────────────────────────────────────────────────────
router.post("/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Valid email and password required" });

    const { email, password } = req.body;
    try {
      const { rows } = await db.query("SELECT * FROM users WHERE email = $1 AND is_active = true", [email]);
      if (!rows[0]) return res.status(401).json({ error: "Invalid email or password" });
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: "Invalid email or password" });

      if (!user.is_admin && user.verification_status === "pending")
        return res.status(403).json({ error: "Your account is pending review. We will notify you within 24 hours.", code: "PENDING_REVIEW" });
      if (user.verification_status === "rejected")
        return res.status(403).json({ error: `Your account was not approved. Reason: ${user.verification_notes || "Contact support"}`, code: "REJECTED" });

      const { access, refresh } = generateTokens(user.id);
      await saveRefreshToken(user.id, refresh);

      return res.json({
        message: "Login successful",
        user: {
          id: user.id, name: user.name, email: user.email, phone: user.phone,
          industry: user.industry, bio: user.bio,
          verification_type: user.verification_type,
          verification_status: user.verification_status,
          is_admin: user.is_admin,
          lat: user.lat, lng: user.lng, city: user.city,
        },
        accessToken: access,
        refreshToken: refresh,
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Login failed. Please try again." });
    }
  }
);

// ─── REFRESH ─────────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows } = await db.query(
      "SELECT * FROM refresh_tokens WHERE token=$1 AND user_id=$2 AND expires_at>NOW()",
      [refreshToken, decoded.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: "Invalid or expired refresh token" });
    await db.query("DELETE FROM refresh_tokens WHERE token=$1", [refreshToken]);
    const { access, refresh } = generateTokens(decoded.userId);
    await saveRefreshToken(decoded.userId, refresh);
    return res.json({ accessToken: access, refreshToken: refresh });
  } catch { return res.status(401).json({ error: "Invalid refresh token" }); }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
router.post("/logout", authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.query("DELETE FROM refresh_tokens WHERE token=$1", [refreshToken]);
  return res.json({ message: "Logged out" });
});

// ─── ME ──────────────────────────────────────────────────────────────────────
router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));

// ─── UPDATE LOCATION ─────────────────────────────────────────────────────────
router.put("/location", authenticate, async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng required" });
  try {
    await db.query("UPDATE users SET lat=$1, lng=$2 WHERE id=$3", [lat, lng, req.user.id]);
    return res.json({ message: "Location updated" });
  } catch { return res.status(500).json({ error: "Failed to update location" }); }
});

// ─── UPDATE PROFILE ──────────────────────────────────────────────────────────
router.put("/me", authenticate,
  [body("name").optional().trim().notEmpty(), body("bio").optional().trim(), body("industry").optional().trim()],
  async (req, res) => {
    const { name, phone, bio, industry } = req.body;
    try {
      const { rows } = await db.query(
        `UPDATE users SET name=COALESCE($1,name), phone=COALESCE($2,phone), bio=COALESCE($3,bio), industry=COALESCE($4,industry)
         WHERE id=$5 RETURNING id,name,email,phone,industry,bio,verification_type,verification_status,lat,lng,city`,
        [name, phone, bio, industry, req.user.id]
      );
      return res.json({ user: rows[0] });
    } catch { return res.status(500).json({ error: "Update failed" }); }
  }
);

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────
router.put("/change-password", authenticate,
  [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 8 })],
  async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const { rows } = await db.query("SELECT password_hash FROM users WHERE id=$1", [req.user.id]);
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match) return res.status(400).json({ error: "Current password is incorrect" });
      const hash = await bcrypt.hash(newPassword, 12);
      await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
      await db.query("DELETE FROM refresh_tokens WHERE user_id=$1", [req.user.id]);
      return res.json({ message: "Password changed. Please log in again." });
    } catch { return res.status(500).json({ error: "Password change failed" }); }
  }
);

module.exports = router;
