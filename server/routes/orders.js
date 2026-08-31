const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = 'slip_' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// ດຶງລາຍການອໍເດີທັງໝົດ (ແອັດມິນເທົ່ານັ້ນ)
router.get('/', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT orders.*, products.name AS product_name, products.price
    FROM orders
    JOIN products ON orders.product_id = products.id
    ORDER BY orders.created_at DESC
  `).all();
  res.json(orders);
});

// ລູກຄ້າສັ່ງຊື້ — ຮັບຂໍ້ມູນລູກຄ້າ + ຮູບສະລິບໄປພ້ອມ (ໃຊ້ FormData ບໍ່ໃຊ້ JSON ອີກຕໍ່ໄປ)
router.post('/', upload.single('slip'), (req, res) => {
  const { product_id, quantity, customer_phone, customer_address } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(404).json({ error: 'ບໍ່ພົບສິນຄ້ານີ້' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({ error: 'ສິນຄ້າບໍ່ພໍ' });
  }
  if (!customer_phone || !customer_address) {
    return res.status(400).json({ error: 'ກະລຸນາໃສ່ເບີໂທ ແລະ ທີ່ຢູ່' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'ກະລຸນາອັບໂຫລດຮູບສະລິບໂອນເງິນ' });
  }

  const slipImage = '/uploads/' + req.file.filename;

  const stmt = db.prepare(`
    INSERT INTO orders (product_id, quantity, customer_phone, customer_address, slip_image)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(product_id, quantity, customer_phone, customer_address, slipImage);

  db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

  res.json({ id: result.lastInsertRowid, message: 'ສັ່ງຊື້ສຳເລັດ' });
});

// ປ່ຽນສະຖານະອໍເດີ (ແອັດມິນເທົ່ານັ້ນ)
router.put('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;