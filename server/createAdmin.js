const db = require('./db');
const bcrypt = require('bcryptjs');

// ປ່ຽນ username ແລະ password ຕາມທີ່ຕ້ອງການ
const username = 'admin';
const password = '123456';

const hashedPassword = bcrypt.hashSync(password, 10);

try {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(username, hashedPassword);
  console.log('ສ້າງບັນຊີແອດມິນສຳເລັດ: ' + username);
} catch (err) {
  console.log('ອາດຈະມີບນຊີນີ້ຢູ່ແລ້ວ:', err.message);
}