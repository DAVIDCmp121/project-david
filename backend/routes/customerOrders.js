const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// GET /api/customer/orders - ດຶງອໍເດີທັງໝົດຂອງລູກຄ້າທີ່ login ຢູ່ (ຮອງຮັບຫຼາຍສິນຄ້າຕໍ່ 1 ອໍເດີ)
// total = ຍອດສິນຄ້າ − ສ່ວນຫຼຸດຄູປອງ (ຍອດທີ່ຈ່າຍຈິງ), subtotal = ຍອດກ່ອນຫຼຸດ
router.get('/orders', requireCustomerAuth, async (req, res) => {
  try {
    const customerId = req.customerId;

    const [orders] = await pool.query(`
      SELECT
        orders.id,
        orders.created_at,
        orders.order_status,
        orders.bill_number,
        orders.customer_phone,
        orders.customer_address,
        orders.carrier,
        orders.payment_method,
        orders.discount_amount,
        coupons.name AS coupon_name,
        (SELECT COALESCE(SUM(pl.points), 0) FROM points_ledger pl
          WHERE pl.order_id = orders.id AND pl.type IN ('earn', 'adjust')) AS points_earned
      FROM orders
      LEFT JOIN user_coupons uc ON uc.id = orders.user_coupon_id
      LEFT JOIN coupons ON coupons.id = uc.coupon_id
      WHERE orders.customer_id = ?
      ORDER BY orders.created_at DESC
    `, [customerId]);

    if (orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    const orderIds = orders.map(o => o.id);
    const [items] = await pool.query(`
      SELECT
        order_items.order_id,
        order_items.product_id,
        order_items.quantity,
        order_items.price_at_order,
        order_items.size,
        products.name AS product_name,
        products.image
      FROM order_items
      LEFT JOIN products ON products.id = order_items.product_id
      WHERE order_items.order_id IN (?)
    `, [orderIds]);

    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        product_id: item.product_id,
        product_name: item.product_name,
        image: item.image,
        quantity: item.quantity,
        price_at_order: item.price_at_order,
        size: item.size || ''
      });
    }

    const ordersWithItems = orders.map(order => {
      const orderItems = itemsByOrder[order.id] || [];
      const subtotal = orderItems.reduce((sum, i) => sum + i.price_at_order * i.quantity, 0);
      const discount = Number(order.discount_amount || 0);
      return {
        ...order,
        items: orderItems,
        subtotal,
        discount_amount: discount,
        points_earned: Number(order.points_earned || 0),
        total: subtotal - discount
      };
    });

    res.json({ success: true, orders: ordersWithItems });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    res.status(500).json({ success: false, message: 'ดึงข้อมูลออเดอร์ไม่สำเร็จ' });
  }
});

module.exports = router;