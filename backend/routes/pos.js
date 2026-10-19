const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { EFFECTIVE_PRICE_SQL } = require('../utils/pricing');
const { adjustStock } = require('../utils/variants');

// error ທີ່ມີຂໍ້ຄວາມສຳລັບສະແດງໃຫ້ພະນັກງານເຫັນ
function userError(message) {
  const e = new Error(message);
  e.userMessage = message;
  return e;
}

// ດຶງ id ຂອງພະນັກງານທີ່ login (ຊື່ field ຂຶ້ນກັບ middleware requireAuth)
function getStaffId(req) {
  const u = req.admin || {};
  const id = u.id || u.adminId || u.userId || u.staffId || u.sub || null;
  return id ? Number(id) : null;
}

// ລາຍການສິນຄ້າສຳລັບໜ້າ POS: ລາຄາຈິງ (ລວມໂປຣ) + ໄຊສ໌ + ສະຕັອກ
router.get('/products', requireAuth, async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT products.id, products.name, products.image, products.category, products.color,
              products.price AS original_price, ${EFFECTIVE_PRICE_SQL} AS price
       FROM products
       ORDER BY products.sort_order ASC, products.id ASC`
    );
    const [variants] = await pool.query(
      `SELECT id, product_id, size, stock_qty
       FROM product_variants
       WHERE active = 1
       ORDER BY id ASC`
    );
    const map = {};
    for (const v of variants) {
      (map[v.product_id] = map[v.product_id] || []).push({
        id: v.id,
        size: v.size,
        stock_qty: v.stock_qty,
      });
    }
    res.json(
      products.map((p) => ({
        ...p,
        price: Number(p.price),
        original_price: Number(p.original_price),
        variants: map[p.id] || [],
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງລາຍການສິນຄ້າບໍ່ສຳເລັດ' });
  }
});

// ບັນທຶກການຂາຍໜ້າຮ້ານ
// body: { items: [{ variant_id, quantity }], payment_method: 'cash'|'transfer', discount, customer_phone }
// backend ຄຳນວນລາຄາເອງ ບໍ່ເຊື່ອຕົວເລກຈາກ frontend
router.post('/sales', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    const paymentMethod = req.body.payment_method === 'transfer' ? 'transfer' : 'cash';
    const customerPhone = String(req.body.customer_phone || '').trim();
    const staffId = getStaffId(req);

    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'ຍັງບໍ່ມີສິນຄ້າໃນບິນ' });
    }

    // ລວມລາຍການທີ່ເປັນ variant ດຽວກັນ
    const qtyByVariant = {};
    for (const it of rawItems) {
      const vid = parseInt(it.variant_id, 10);
      const qty = parseInt(it.quantity, 10);
      if (!vid || !qty || qty < 1) {
        return res.status(400).json({ error: 'ຂໍ້ມູນສິນຄ້າໃນບິນບໍ່ຖືກຕ້ອງ' });
      }
      qtyByVariant[vid] = (qtyByVariant[vid] || 0) + qty;
    }
    const variantIds = Object.keys(qtyByVariant).map(Number);

    // ດຶງ variant + ຊື່ + ລາຄາຈິງ ຈາກຖານຂໍ້ມູນ
    const [rows] = await pool.query(
      `SELECT v.id AS variant_id, v.size, v.active, products.id AS product_id, products.name,
              ${EFFECTIVE_PRICE_SQL} AS price
       FROM product_variants v
       JOIN products ON products.id = v.product_id
       WHERE v.id IN (?)`,
      [variantIds]
    );
    if (rows.length !== variantIds.length || rows.some((r) => !Number(r.active))) {
      return res.status(400).json({ error: 'ມີສິນຄ້າບາງລາຍການບໍ່ມີໃນລະບົບແລ້ວ ກະລຸນາໂຫຼດໜ້າໃໝ່' });
    }

    const lines = rows.map((r) => ({
      variant_id: r.variant_id,
      product_id: r.product_id,
      name: r.name,
      size: r.size || '',
      price: Number(r.price),
      quantity: qtyByVariant[r.variant_id],
    }));
    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);

    let discount = Math.max(0, parseInt(req.body.discount, 10) || 0);
    if (discount > subtotal) discount = subtotal;
    const total = subtotal - discount;

    // ຖ້າໃສ່ເບີໂທ ແລະ ເປັນສະມາຊິກ ໃຫ້ຜູກກັບບັນຊີນັ້ນ
    let customerId = null;
    if (customerPhone) {
      const [cRows] = await pool.query(
        'SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL',
        [customerPhone]
      );
      if (cRows[0]) customerId = cRows[0].id;
    }

    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO orders
        (customer_phone, customer_id, order_status, payment_method, channel, discount_amount)
       VALUES (?, ?, 'delivered', ?, 'store', ?)`,
      [customerPhone || null, customerId, paymentMethod, discount]
    );
    const orderId = ins.insertId;

    for (const l of lines) {
      const ok = await adjustStock(conn, {
        variantId: l.variant_id,
        productId: l.product_id,
        change: -l.quantity,
        reason: 'sale',
        channel: 'store',
        orderId,
      });
      if (!ok) {
        const sz = l.size ? ` ໄຊສ໌ ${l.size}` : '';
        throw userError(`ສິນຄ້າ "${l.name}"${sz} ສະຕັອກບໍ່ພໍ`);
      }
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_order, size, variant_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, l.product_id, l.quantity, l.price, l.size, l.variant_id]
      );
    }

    // ບັນທຶກວ່າພະນັກງານຄົນໃດເປັນຄົນຂາຍ (ໃນປະຫວັດສະຕັອກຂອງບິນນີ້)
    if (staffId) {
      await conn.query(
        'UPDATE stock_movements SET staff_id = ? WHERE order_id = ? AND channel = ?',
        [staffId, orderId, 'store']
      );
    }

    await conn.commit();
    res.json({
      id: orderId,
      subtotal,
      discount,
      total,
      payment_method: paymentMethod,
      lines,
    });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    if (err.userMessage) {
      return res.status(400).json({ error: err.userMessage });
    }
    console.error('POS SALE ERROR:', err);
    res.status(500).json({ error: 'ບັນທຶກການຂາຍບໍ່ສຳເລັດ' });
  } finally {
    conn.release();
  }
});

// ສະຫຼຸບການຂາຍໜ້າຮ້ານມື້ນີ້ (ເວລາລາວ UTC+7) + ບິນລ່າສຸດ
// ໝາຍເຫດ: ສົມມຸດວ່າ created_at ເກັບເປັນ UTC (ຄ່າເລີ່ມຕົ້ນຂອງ Docker MySQL / TiDB)
router.get('/today', requireAuth, async (req, res) => {
  try {
    const todayLao = `DATE(CONVERT_TZ(o.created_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))`;

    const [orders] = await pool.query(
      `SELECT o.id, o.created_at, o.payment_method, o.discount_amount,
              COALESCE(SUM(oi.price_at_order * oi.quantity), 0) AS subtotal,
              COALESCE(SUM(oi.quantity), 0) AS qty
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.channel = 'store' AND o.order_status <> 'cancelled' AND ${todayLao}
       GROUP BY o.id
       ORDER BY o.id DESC`
    );

    let total = 0;
    let cash = 0;
    let transfer = 0;
    let pieces = 0;
    const bills = orders.map((o) => {
      const t = Number(o.subtotal) - Number(o.discount_amount || 0);
      total += t;
      pieces += Number(o.qty);
      if (o.payment_method === 'transfer') transfer += t;
      else cash += t;
      return {
        id: o.id,
        created_at: o.created_at,
        payment_method: o.payment_method,
        qty: Number(o.qty),
        total: t,
      };
    });

    res.json({
      count: bills.length,
      pieces,
      total,
      cash,
      transfer,
      bills: bills.slice(0, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງຍອດຂາຍມື້ນີ້ບໍ່ສຳເລັດ' });
  }
});

module.exports = router;