const db = require('./db');
db.prepare(`UPDATE admins SET name = ? WHERE username = ?`).run('DAVID ເຈົ້າຂອງຮ້ານ', 'admin');
console.log('ອັບເດດຊື່ admin ສຳເລັດ');