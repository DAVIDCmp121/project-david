const express = require('express');
const router = express.Router();
const db = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// GET /api/customer/orders - ดึงออเดอร์ทั้งหมดของลูกค้าที่ login อยู่
router.get('/orders', requireCustomerAuth, (req, res) => {
  try {
    const customerId = req.customerId; // ตรงกับที่ middleware set ไว้

    const orders = db.prepare(`
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
    `).all(customerId);

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ success: false, message: 'ดึงข้อมูลออเดอร์ไม่สำเร็จ' });
  }
});

module.exports = router;