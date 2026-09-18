const bcrypt = require('bcryptjs');
const db = require('./db');

const username = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

if (!username || !password || !name) {
  console.log('วิธใช้: node server/createAdmin.js <username> <password> "<ชื่อ>"');
  process.exit(1);
}

(async () => {
  const hashed = bcrypt.hashSync(password, 10);

  try {
    const [result] = await db.query(
      `INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, 'admin')`,
      [username, hashed, name]
    );
    console.log(`เพิ่ม admin "${name}" (${username}) สำเร็จ, id: ${result.insertId}`);
  } catch (err) {
    console.error('เกิดข้อผิดพลาด:', err.message);
  }
  process.exit(0);
})();