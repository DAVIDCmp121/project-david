const db = require('./server/db');
const rows = db.prepare('SELECT id, username, name, role FROM admins').all();
console.log(rows);