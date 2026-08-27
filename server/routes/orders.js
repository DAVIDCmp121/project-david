const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAuth = require('../middleware/requireAuth'); // ➕ ເພີ່ມແຖວນີ້

// ດຶງລາຍການອໍເດີທັງໝົດ (ແອັດມິນເທົ່ານັ້ນ)
router.get('/', requireAuth, (req, res) => {   // ➕ ເພີ່ມ requireAuth
  const orders = db.prepare(`
    SELECT orders.*, products.name AS product_name, products.price
    FROM orders
    JOIN products ON orders.product_id = products.id
    ORDER BY orders.created_at DESC
  `).all();
  res.json(orders);
});

// ລູກຄ້າສັ່ງຊື້ (ບໍ່ຕ້ອງ login — ເປີດໄວ້ໃຫ້ລູກຄ້າໃຊ້)
router.post('/', (req, res) => {
  const { product_id, quantity } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(404).json({ error: 'ບໍ່ພົບສິນຄ້ານີ້' });
  }
  if (product.stock < quantity) {
    return res.status(400).json({ error: 'ສິນຄ້າບໍ່ພໍ' });
  }

  const stmt = db.prepare('INSERT INTO orders (product_id, quantity) VALUES (?, ?)');
  const result = stmt.run(product_id, quantity);

  db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

  res.json({ id: result.lastInsertRowid, message: 'ສັ່ງຊື້ສຳເລັດ' });
});

// ປ່ຽນສະຖານະອໍເດີ (ແອັດມິນເທົ່ານັ້ນ)
router.put('/:id', requireAuth, (req, res) => {   // ➕ ເພີ່ມ requireAuth
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;