const router = require("express").Router();
const db = require("../db");
const { authenticate, requireAdmin } = require("../middleware/auth");

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── STATS ───────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE verification_status='pending' AND is_admin=false) AS pending,
        COUNT(*) FILTER (WHERE verification_status='approved' AND is_admin=false) AS approved,
        COUNT(*) FILTER (WHERE verification_status='rejected') AS rejected,
        COUNT(*) FILTER (WHERE is_admin=false) AS total_users,
        COUNT(*) FILTER (WHERE verification_status='approved' AND created_at > NOW()-INTERVAL '24 hours' AND is_admin=false) AS approved_today
      FROM users
    `);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── PENDING USERS ───────────────────────────────────────────────────────────
router.get("/pending", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name, email, phone, industry, city,
        verification_type, verification_status, verification_notes,
        din_number, din_director_name, linkedin_url,
        succession_prev_din, succession_new_din, succession_doc_url,
        created_at
      FROM users
      WHERE verification_status = 'pending' AND is_admin = false
      ORDER BY created_at ASC
    `);
    return res.json({ users: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pending users" });
  }
});

// ─── ALL USERS ────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = "WHERE is_admin = false";
    const params = [];
    if (status) { params.push(status); where += ` AND verification_status = $${params.length}`; }
    params.push(parseInt(limit), offset);
    const { rows } = await db.query(
      `SELECT id, name, email, industry, city,
        verification_type, verification_status, verification_notes,
        din_number, din_director_name, linkedin_url,
        created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return res.json({ users: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─── APPROVE USER ────────────────────────────────────────────────────────────
router.put("/users/:userId/approve", async (req, res) => {
  const { userId } = req.params;
  const { notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE users SET verification_status='approved', verification_notes=$1
       WHERE id=$2 AND is_admin=false
       RETURNING id, name, email, verification_status`,
      [notes || "Verified and approved by admin", userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    return res.json({ message: `${rows[0].name} has been approved`, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to approve user" });
  }
});

// ─── REJECT USER ─────────────────────────────────────────────────────────────
router.put("/users/:userId/reject", async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: "Rejection reason is required" });
  try {
    const { rows } = await db.query(
      `UPDATE users SET verification_status='rejected', verification_notes=$1
       WHERE id=$2 AND is_admin=false
       RETURNING id, name, email, verification_status`,
      [reason.trim(), userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    return res.json({ message: `${rows[0].name} has been rejected`, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to reject user" });
  }
});

// ─── DEACTIVATE USER ─────────────────────────────────────────────────────────
router.put("/users/:userId/deactivate", async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query("UPDATE users SET is_active=false WHERE id=$1 AND is_admin=false", [userId]);
    return res.json({ message: "User deactivated" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to deactivate user" });
  }
});

module.exports = router;
