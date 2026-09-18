require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const { pool } = require('./db');

const sqliteDb = new Database(path.join(__dirname, 'store.db'));

async function migrate() {
  console.log('เริ่มย้ายข้อมล...');

  const products = sqliteDb.prepare('SELECT * FROM products').all();
  for (const p of products) {
    await pool.query(
      'INSERT INTO products (id, name, price, size, color, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [p.id, p.name, p.price, p.size, p.color, p.stock, p.image]
    );
  }
  console.log(`✅ ย้าย products แลว ${products.length} รายการ`);

  const admins = sqliteDb.prepare('SELECT * FROM admins').all();
  for (const a of admins) {
    await pool.query(
      'INSERT INTO admins (id, username, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [a.id, a.username, a.password, a.name, a.role, a.created_at]
    );
  }
  console.log(`✅ ย้าย admins แลว ${admins.length} รายการ`);

  const customers = sqliteDb.prepare('SELECT * FROM customers').all();
  for (const c of customers) {
    await pool.query(
      'INSERT INTO customers (id, phone, pin_hash, name, created_at) VALUES (?, ?, ?, ?, ?)',
      [c.id, c.phone, c.pin_hash, c.name, c.created_at]
    );
  }
  console.log(`✅ ย้าย customers แล้ว ${customers.length} รายการ`);

  const orders = sqliteDb.prepare('SELECT * FROM orders').all();
  for (const o of orders) {
    await pool.query(
      `INSERT INTO orders 
       (id, product_id, quantity, status, created_at, customer_phone, customer_address, slip_image, customer_id, bill_number, order_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.id, o.product_id, o.quantity, o.status, o.created_at, o.customer_phone, o.customer_address, o.slip_image, o.customer_id, o.bill_number, o.order_status]
    );
  }
  console.log(`✅ ย้าย orders แล้ว ${orders.length} รายการ`);

  const messages = sqliteDb.prepare('SELECT * FROM messages').all();
  for (const m of messages) {
    await pool.query(
      'INSERT INTO messages (id, customer_id, sender, message_text, image_url, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [m.id, m.customer_id, m.sender, m.message_text, m.image_url, m.is_read, m.created_at]
    );
  }
  console.log(`✅ ย้าย messages แล้ว ${messages.length} รายการ`);

  const settings = sqliteDb.prepare('SELECT * FROM settings').all();
  for (const s of settings) {
    await pool.query('INSERT INTO settings (`key`, value) VALUES (?, ?)', [s.key, s.value]);
  }
  console.log(`✅ ย้าย settings แล้ว ${settings.length} รายการ`);

  // ปรับ AUTO_INCREMENT ใหตอจาก id เดม ไม่งนแถวใหม่ทีเพมทหลงจะชน id ซ
  await pool.query('ALTER TABLE products AUTO_INCREMENT = ?', [(products.at(-1)?.id || 0) + 1]);
  await pool.query('ALTER TABLE admins AUTO_INCREMENT = ?', [(admins.at(-1)?.id || 0) + 1]);
  await pool.query('ALTER TABLE customers AUTO_INCREMENT = ?', [(customers.at(-1)?.id || 0) + 1]);
  await pool.query('ALTER TABLE orders AUTO_INCREMENT = ?', [(orders.at(-1)?.id || 0) + 1]);
  await pool.query('ALTER TABLE messages AUTO_INCREMENT = ?', [(messages.at(-1)?.id || 0) + 1]);

  console.log('🎉 ยายข้อมูลเสร็จสมบูรณ์!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ เกิดข้อผดพลาด:', err);
  process.exit(1);
});