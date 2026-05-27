const router = require("express").Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
router.post("/:targetId", authenticate, async (req, res) => {
  const { targetId } = req.params;
  const { content } = req.body;
  const senderId = req.user.id;

  if (!content?.trim()) return res.status(400).json({ error: "Message cannot be empty" });
  if (senderId === targetId) return res.status(400).json({ error: "Cannot message yourself" });

  try {
    // Must be connected
    const { rows: conn } = await db.query(
      "SELECT id FROM connections WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)",
      [senderId, targetId]
    );
    if (!conn[0]) return res.status(403).json({ error: "You must be connected to message this user" });

    const { rows } = await db.query(
      "INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *",
      [senderId, targetId, content.trim()]
    );
    return res.status(201).json({ message: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// ─── GET CONVERSATION ─────────────────────────────────────────────────────────
router.get("/:targetId", authenticate, async (req, res) => {
  const { targetId } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Mark received messages as read
    await db.query(
      "UPDATE messages SET read = true WHERE sender_id = $1 AND receiver_id = $2 AND read = false",
      [targetId, userId]
    );

    const { rows } = await db.query(
      `SELECT m.*, u.name AS sender_name FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC LIMIT $3 OFFSET $4`,
      [userId, targetId, parseInt(limit), offset]
    );
    return res.json({ messages: rows.reverse() });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ─── LIST CONVERSATIONS ───────────────────────────────────────────────────────
router.get("/", authenticate, async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (other_user)
        other_user,
        u.name AS other_name,
        u.industry AS other_industry,
        last_msg.content AS last_message,
        last_msg.created_at AS last_message_at,
        last_msg.sender_id AS last_sender_id,
        unread.count::int AS unread_count
       FROM (
         SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user,
           id, content, created_at, sender_id
         FROM messages WHERE sender_id = $1 OR receiver_id = $1
       ) last_msg
       JOIN users u ON u.id = last_msg.other_user
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS count FROM messages
         WHERE sender_id = last_msg.other_user AND receiver_id = $1 AND read = false
       ) unread ON true
       ORDER BY other_user, last_msg.created_at DESC`,
      [userId]
    );
    return res.json({ conversations: rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

module.exports = router;
