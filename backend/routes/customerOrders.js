const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// GET /api/customer/orders - ดึงออเดอร์ทั้งหมดของลูกค้าที่ login อยู่
router.get('/orders', requireCustomerAuth, async (req, res) => {
  try {
    const customerId = req.customerId;

    const [orders] = await pool.query(`
      SELECT
        orders.id,
        orders.created_at,
        orders.order_status,
        orders.bill_number,
        products.name AS product_name,
        products.price,
        orders.quantity
      FROM orders
      LEFT JOIN products ON products.id = orders.product_id
      WHERE orders.customer_id = ?
      ORDER BY orders.created_at DESC
    `, [customerId]);

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ success: false, message: 'ดึงข้อมูลออเดอร์ไม่สำเร็จ' });
  }
});

module.exports = router;