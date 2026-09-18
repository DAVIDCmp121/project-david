const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const requireAdminRole = require('../middleware/requireAdminRole');

// ตั้งค่า multer ให้เก็บไฟลที่ public/uploads
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

// ดึงสินคาทั้งหมด (ทุกคนดูได้ ไมต้อง login)
router.get('/', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products');
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດງຂມູນສນຄ້າບສເລດ' });
  }
});

// ເພມສນຄ້າໃໝ — ต้อง login และตองเป็น role='admin' เท่านั้น
router.post('/', requireAuth, requireAdminRole, upload.single('image'), async (req, res) => {
  try {
    const { name, price, size, color, stock } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : '';

    const [result] = await pool.query(
      'INSERT INTO products (name, price, size, color, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
      [name, price, size, color, stock, image]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ເພມສນຄ້າບສເລັດ' });
  }
});

// ລບສິນຄ້າ — ต้อง login และต้องเป็น role='admin' เท่านั้น (staff ทำไม่ได้)
router.delete('/:id', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const productId = req.params.id;

    await pool.query('DELETE FROM orders WHERE product_id = ?', [productId]);
    await pool.query('DELETE FROM products WHERE id = ?', [productId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ລບສິນຄ້າບສເລດ' });
  }
});

module.exports = router;