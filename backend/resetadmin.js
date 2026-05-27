require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function main() {
  const hash = await bcrypt.hash('Admin@1234', 12);
  await db.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2',
    [hash, 'admin@bsquare.in']
  );
  console.log('Admin password reset successfully!');
  process.exit();
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });