const db = require('./db');

(async () => {
  try {
    await db.query(`ALTER TABLE orders ADD COLUMN cancelled_by TEXT`);
    console.log('✅ เพิ่มคอลัมน์ cancelled_by สำเร็จ');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ คอลัมน์ cancelled_by มอยู่แล้ว');
    } else {
      console.error('❌ Error:', err.message);
    }
  }

  const [columns] = await db.query(`SHOW COLUMNS FROM orders`);
  console.log(columns);
  process.exit(0);
})();