const db = require('./server/db');

try {
  db.prepare(`ALTER TABLE orders ADD COLUMN cancelled_by TEXT`).run();
  console.log('✅ ເພີ່ມຄໍລຳ cancelled_by ສຳເລັດ');
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('ℹ️ ຄໍລຳ cancelled_by ມີຢູ່ແລ້ວ');
  } else {
    console.error('❌ Error:', err.message);
  }
}

const columns = db.prepare(`PRAGMA table_info(orders)`).all();
console.log(columns);