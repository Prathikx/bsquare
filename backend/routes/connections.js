const router = require("express").Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

// ─── SEND CONNECTION REQUEST ──────────────────────────────────────────────────
router.post("/request/:targetId", authenticate, async (req, res) => {
  const { targetId } = req.params;
  const senderId = req.user.id;
  if (senderId === targetId) return res.status(400).json({ error: "Cannot connect with yourself" });
  try {
    const { rows: target } = await db.query(
      "SELECT id FROM users WHERE id = $1 AND is_active = true AND verification_status = 'approved'",
      [targetId]
    );
    if (!target[0]) return res.status(404).json({ error: "User not found" });

    const { rows: conn } = await db.query(
      "SELECT id FROM connections WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)",
      [senderId, targetId]
    );
    if (conn[0]) return res.status(409).json({ error: "Already connected" });

    const { rows: existing } = await db.query(
      "SELECT id, status, sender_id FROM connection_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)",
      [senderId, targetId]
    );

    if (existing[0]) {
      if (existing[0].status === "pending") {
        if (existing[0].sender_id === targetId) {
          await db.query("UPDATE connection_requests SET status = 'accepted' WHERE id = $1", [existing[0].id]);
          const a = senderId < targetId ? senderId : targetId;
          const b = senderId < targetId ? targetId : senderId;
          await db.query("INSERT INTO connections (user_a_id, user_b_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [a, b]);
          return res.json({ message: "Connected!", status: "connected" });
        }
        return res.status(409).json({ error: "Connection request already sent" });
      }
      if (existing[0].status === "declined") {
        await db.query(
          "UPDATE connection_requests SET status = 'pending', sender_id = $1, receiver_id = $2, updated_at = NOW() WHERE id = $3",
          [senderId, targetId, existing[0].id]
        );
        return res.status(201).json({ message: "Connection request sent", status: "pending" });
      }
    }

    await db.query("INSERT INTO connection_requests (sender_id, receiver_id) VALUES ($1, $2)", [senderId, targetId]);
    return res.status(201).json({ message: "Connection request sent", status: "pending" });
  } catch (err) {
    console.error("Send request error:", err.message, err.code);
    return res.status(500).json({ error: "Failed to send request" });
  }
});

// ─── ACCEPT REQUEST ───────────────────────────────────────────────────────────
router.put("/request/:requestId/accept", authenticate, async (req, res) => {
  const { requestId } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT * FROM connection_requests WHERE id = $1 AND receiver_id = $2 AND status = 'pending'",
      [requestId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Request not found" });
    const { sender_id, receiver_id } = rows[0];
    await db.query("UPDATE connection_requests SET status = 'accepted' WHERE id = $1", [requestId]);
    const a = sender_id < receiver_id ? sender_id : receiver_id;
    const b = sender_id < receiver_id ? receiver_id : sender_id;
    await db.query("INSERT INTO connections (user_a_id, user_b_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [a, b]);
    return res.json({ message: "Connection accepted" });
  } catch (err) {
    console.error("Accept error:", err.message);
    return res.status(500).json({ error: "Failed to accept request" });
  }
});

// ─── DECLINE REQUEST ──────────────────────────────────────────────────────────
router.put("/request/:requestId/decline", authenticate, async (req, res) => {
  const { requestId } = req.params;
  try {
    const { rows } = await db.query(
      "UPDATE connection_requests SET status = 'declined' WHERE id = $1 AND receiver_id = $2 AND status = 'pending' RETURNING id",
      [requestId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Request not found" });
    return res.json({ message: "Request declined" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to decline request" });
  }
});

// ─── CANCEL SENT REQUEST ──────────────────────────────────────────────────────
router.delete("/request/:requestId", authenticate, async (req, res) => {
  const { requestId } = req.params;
  try {
    const { rows } = await db.query(
      "DELETE FROM connection_requests WHERE id = $1 AND sender_id = $2 AND status = 'pending' RETURNING id",
      [requestId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Request not found" });
    return res.json({ message: "Request cancelled" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to cancel request" });
  }
});

// ─── REMOVE CONNECTION ────────────────────────────────────────────────────────
router.delete("/:targetId", authenticate, async (req, res) => {
  const { targetId } = req.params;
  try {
    await db.query(
      "DELETE FROM connections WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)",
      [req.user.id, targetId]
    );
    return res.json({ message: "Connection removed" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to remove connection" });
  }
});

// ─── LIST MY CONNECTIONS ──────────────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.industry, u.bio, u.city,
        u.verification_type, u.verification_status, c.created_at AS connected_since
       FROM connections c
       JOIN users u ON (u.id = CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END)
       WHERE (c.user_a_id = $1 OR c.user_b_id = $1) AND u.is_active = true
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    return res.json({ connections: rows });
  } catch (err) {
    console.error("List connections error:", err.message);
    return res.status(500).json({ error: "Failed to fetch connections" });
  }
});

// ─── RECEIVED REQUESTS ────────────────────────────────────────────────────────
router.get("/requests/received", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.id AS request_id, cr.created_at, u.id, u.name, u.industry, u.bio, u.city
       FROM connection_requests cr
       JOIN users u ON u.id = cr.sender_id
       WHERE cr.receiver_id = $1 AND cr.status = 'pending' AND u.is_active = true
       ORDER BY cr.created_at DESC`,
      [req.user.id]
    );
    return res.json({ requests: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// ─── SENT REQUESTS ────────────────────────────────────────────────────────────
router.get("/requests/sent", authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.id AS request_id, cr.created_at, u.id, u.name, u.industry, u.bio, u.city
       FROM connection_requests cr
       JOIN users u ON u.id = cr.receiver_id
       WHERE cr.sender_id = $1 AND cr.status = 'pending' AND u.is_active = true
       ORDER BY cr.created_at DESC`,
      [req.user.id]
    );
    return res.json({ requests: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch sent requests" });
  }
});

module.exports = router;
