const router = require("express").Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

const HAVERSINE = `(6371 * acos(LEAST(1, cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))))`;

router.get("/nearby", authenticate, async (req, res) => {
  const { radius=10, industry, page=1, limit=20 } = req.query;
  const { lat, lng, id:currentId } = req.user;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    let filterSQL=""; const params=[lat, lng, parseFloat(radius), currentId]; let idx=5;
    if(industry){filterSQL+=` AND LOWER(u.industry) LIKE $${idx}`;params.push(`%${industry.toLowerCase()}%`);idx++;}
    const sql=`
      SELECT u.id, u.name, u.industry, u.bio, u.city,
        u.verification_type, u.verification_status,
        ${HAVERSINE} AS distance_km,
        CASE WHEN c.id IS NOT NULL THEN 'connected'
             WHEN cr_sent.id IS NOT NULL THEN 'request_sent'
             WHEN cr_recv.id IS NOT NULL THEN 'request_received'
             ELSE 'none' END AS connection_status
      FROM users u
      LEFT JOIN connections c ON (c.user_a_id=$4 AND c.user_b_id=u.id) OR (c.user_b_id=$4 AND c.user_a_id=u.id)
      LEFT JOIN connection_requests cr_sent ON cr_sent.sender_id=$4 AND cr_sent.receiver_id=u.id AND cr_sent.status='pending'
      LEFT JOIN connection_requests cr_recv ON cr_recv.receiver_id=$4 AND cr_recv.sender_id=u.id AND cr_recv.status='pending'
      WHERE u.id!=$4 AND u.is_active=true AND u.verification_status='approved' AND u.is_admin=false
        AND ${HAVERSINE}<=$3 ${filterSQL}
      ORDER BY distance_km ASC
      LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    const { rows } = await db.query(sql, params);
    return res.json({ users:rows, page:parseInt(page), limit:parseInt(limit) });
  } catch(err){ console.error(err); return res.status(500).json({ error:"Failed to fetch nearby users" }); }
});

router.get("/:userId", authenticate, async (req,res) => {
  const { userId } = req.params; const currentId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.industry, u.bio, u.city, u.verification_type, u.verification_status, u.created_at,
        CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS is_connected,
        CASE WHEN c.id IS NOT NULL THEN u.email ELSE NULL END AS email,
        CASE WHEN c.id IS NOT NULL THEN u.phone ELSE NULL END AS phone
       FROM users u
       LEFT JOIN connections c ON (c.user_a_id=$1 AND c.user_b_id=u.id) OR (c.user_b_id=$1 AND c.user_a_id=u.id)
       WHERE u.id=$2 AND u.is_active=true`,
      [currentId, userId]
    );
    if(!rows[0]) return res.status(404).json({ error:"User not found" });
    return res.json({ user:rows[0] });
  } catch(err){ return res.status(500).json({ error:"Failed to fetch user" }); }
});

module.exports = router;
