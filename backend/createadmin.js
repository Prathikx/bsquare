require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function main() {
  const hash = await bcrypt.hash('Admin@1234', 12);
  await db.query(
    `INSERT INTO users (name, email, password_hash, phone, verification_type, verification_status, is_admin, city, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    ['Admin', 'admin@bsquare.in', hash, '0000000000', 'admin', 'approved', true, 'Hyderabad', 17.385, 78.4867]
  );
  console.log('Admin created successfully!');
  process.exit();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });