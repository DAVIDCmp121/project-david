const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// ດງລາຍລະອຽດສນຄ້າທງໝດທລກຄ້າກດຖືກໃຈໄວ (ໃຊໃນໜາໂປຣໄຟລ)
router.get('/', requireCustomerAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.* FROM favorites f
       JOIN products p ON p.id = f.product_id
       WHERE f.customer_id = ?
       ORDER BY f.created_at DESC`,
      [req.customerId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດງລາຍການທຖືກໃຈບສເລດ' });
  }
});

// ດງສະເພາະ id ສນຄ້າທຖືກໃຈໄວ (ໃຊ້ໃນໜ້າເມນ/ລາຍລະອຽດ ເພອໂຊວຫວໃຈແດງ)
router.get('/ids', requireCustomerAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT product_id FROM favorites WHERE customer_id = ?',
      [req.customerId]
    );
    res.json(rows.map((r) => r.product_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດງຂມນບສເລດ' });
  }
});

// ກດຖືກໃຈ
router.post('/:productId', requireCustomerAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT IGNORE INTO favorites (customer_id, product_id) VALUES (?, ?)',
      [req.customerId, req.params.productId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ບນທກບສເລດ' });
  }
});

// ຍກເລກຖືກໃຈ
router.delete('/:productId', requireCustomerAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE customer_id = ? AND product_id = ?',
      [req.customerId, req.params.productId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ລບບສເລດ' });
  }
});

module.exports = router;