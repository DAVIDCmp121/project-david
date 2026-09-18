// Route ຈດການລາຍຊືລູກຄ້າ + ຣີເຊັດ PIN (ແອດມນ ແລະ ພະນັກງານ ໃຊໄດທງສອງ)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');

router.get('/', requireAuth, async (req, res) => {
  const [customers] = await pool.query(`
    SELECT
      c.id, c.phone, c.name, c.created_at,
      (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) AS order_count
    FROM customers c
    ORDER BY c.created_at DESC
  `);
  res.json({ customers });
});

router.post('/:id/reset-pin', requireAuth, async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
  const customer = rows[0];

  if (!customer) {
    return res.status(404).json({ error: 'ບພບລກຄ້ານ' });
  }

  const newPin = String(Math.floor(1000 + Math.random() * 9000));
  const hashed = await bcrypt.hash(newPin, 10);
  await pool.query('UPDATE customers SET pin_hash = ? WHERE id = ?', [hashed, id]);

  res.json({ success: true, newPin });
});

module.exports = router;