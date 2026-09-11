// Route ຈັດການລາຍຊື່ລູກຄ້າ + ຣີເຊັດ PIN (ແອດມິນ ແລະ ພະນັກງານ ໃຊ້ໄດ້ທັງສອງ)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');

// ດຶງລາຍຊື່ລູກຄ້າທັງໝົດ ພ້ອມຈຳນວນອໍເດີ
router.get('/', requireAuth, (req, res) => {
  const customers = db.prepare(`
    SELECT
      c.id, c.phone, c.name, c.created_at,
      (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) AS order_count
    FROM customers c
    ORDER BY c.created_at DESC
  `).all();
  res.json({ customers });
});

// ຣີເຊັດ PIN ໃຫ້ລູກຄ້າ (ສ້າງເລກສຸ່ມ 4 ໂຕໃໝ່)
router.post('/:id/reset-pin', requireAuth, async (req, res) => {
  const { id } = req.params;
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);

  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບລູກຄ້ານີ້' });
  }

  const newPin = String(Math.floor(1000 + Math.random() * 9000));
  const hashed = await bcrypt.hash(newPin, 10);
  db.prepare('UPDATE customers SET pin_hash = ? WHERE id = ?').run(hashed, id);

  res.json({ success: true, newPin });
});

module.exports = router;