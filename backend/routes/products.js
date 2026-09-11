const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const requireAdminRole = require('../middleware/requireAdminRole');   // ➕ เพิ่มบรรทัดนี้

// ตั้งค่า multer ให้เก็บไฟล์ที่ public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// ดึงสินค้าทั้งหมด (ทุกคนดูได้ ไม่ต้อง login)
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json(products);
});

// ເພີ່ມສິນຄ້າໃໝ່ — ต้อง login และตองเป็น role='admin' เท่านั้น
router.post('/', requireAuth, requireAdminRole, upload.single('image'), (req, res) => {
  const { name, price, size, color, stock } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';

  const stmt = db.prepare(
    'INSERT INTO products (name, price, size, color, stock, image) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, price, size, color, stock, image);
  res.json({ id: result.lastInsertRowid });
});

// ລົບສິນຄ້າ — ต้อง login และต้องเป็น role='admin' เท่านั้น (staff ทำไม่ได้)
router.delete('/:id', requireAuth, requireAdminRole, (req, res) => {
  const productId = req.params.id;

  db.prepare('DELETE FROM orders WHERE product_id = ?').run(productId);
  db.prepare('DELETE FROM products WHERE id = ?').run(productId);

  res.json({ success: true });
});

module.exports = router;