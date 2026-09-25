const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// GET /api/customer/orders - ดึงออเดอร์ทั้งหมดของลูกค้าที่ login อยู่ (รองรับหลายสินค้าต่อ 1 ออเดอร์)
router.get('/orders', requireCustomerAuth, async (req, res) => {
  try {
    const customerId = req.customerId;

    // ดึงหัวออเดอร์ก่อน (ไม่รวมรายสินค้า)
    const [orders] = await pool.query(`
      SELECT
        orders.id,
        orders.created_at,
        orders.order_status,
        orders.bill_number,
        orders.customer_phone,
        orders.customer_address
      FROM orders
      WHERE orders.customer_id = ?
      ORDER BY orders.created_at DESC
    `, [customerId]);

    if (orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    // ดึงรายการสินค้าทั้งหมดของออเดอร์เหล่านี้ในครั้งเดียว (กัน N+1 query)
    const orderIds = orders.map(o => o.id);
    const [items] = await pool.query(`
      SELECT
        order_items.order_id,
        order_items.product_id,
        order_items.quantity,
        order_items.price_at_order,
        products.name AS product_name,
        products.image
      FROM order_items
      LEFT JOIN products ON products.id = order_items.product_id
      WHERE order_items.order_id IN (?)
    `, [orderIds]);

    // จัดกลุ่มรายการสินค้าเข้าออเดอร์ของมัน พร้อมคำนวณยอดรวมต่อออเดอร์
    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        product_id: item.product_id,
        product_name: item.product_name,
        image: item.image,
        quantity: item.quantity,
        price_at_order: item.price_at_order
      });
    }

    const ordersWithItems = orders.map(order => {
      const orderItems = itemsByOrder[order.id] || [];
      const total = orderItems.reduce((sum, i) => sum + i.price_at_order * i.quantity, 0);
      return {
        ...order,
        items: orderItems,
        total
      };
    });

    res.json({ success: true, orders: ordersWithItems });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ success: false, message: 'ดึงข้อมูลออเดอร์ไม่สำเร็จ' });
  }
});

module.exports = router;  