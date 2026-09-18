const db = require('./db');

(async () => {
  await db.query(
    `UPDATE admins SET name = ? WHERE username = ?`,
    ['DAVID เจ้าของร้าน', 'admin']
  );
  console.log('อัปเดตชื่อ admin สำเร็จ');
  process.exit(0);
})();