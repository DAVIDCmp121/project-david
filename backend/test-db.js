const { initDb } = require('./db');

initDb()
  .then(() => {
    console.log('🎉 เชื่อมต่อและสร้างตารางสำเร็จ!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ เกิดข้อผิดพลาด:', err);
    process.exit(1);
  });