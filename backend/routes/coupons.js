const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const { getBalance, POINT_UNIT } = require('../utils/loyalty');

// ===== ລູກຄ້າ =====

// ແຕ້ມ + ຄູປອງໃນກະເປົາ + ລາຍການທີ່ແລກໄດ້
router.get('/me', requireCustomerAuth, async (req, res) => {
  try {
    const points = await getBalance(pool, req.customerId);
    const [coupons] = await pool.query(
      `SELECT uc.id, uc.expires_at, c.name, c.type, c.value, c.min_order, c.max_discount
       FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.customer_id = ? AND uc.status = 'available' AND uc.expires_at > NOW()
       ORDER BY uc.expires_at`,
      [req.customerId]
    );
    const [catalog] = await pool.query(
      `SELECT id, name, type, value, min_order, max_discount, points_cost, valid_days
       FROM coupons WHERE active = 1 ORDER BY points_cost`
    );
    res.json({ points, coupons, catalog, point_unit: POINT_UNIT });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫລດຂໍ້ມູນຄູປອງບໍ່ສຳເລັດ' });
  }
});

// ປະຫວັດແຕ້ມ
router.get('/history', requireCustomerAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, points, type, note, created_at FROM points_ledger
       WHERE customer_id = ? ORDER BY id DESC LIMIT 50`,
      [req.customerId]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫລດປະຫວັດແຕ້ມບໍ່ສຳເລັດ' });
  }
});

// ແລກແຕ້ມເປັນຄູປອງ
router.post('/redeem', requireCustomerAuth, async (req, res) => {
  const couponId = parseInt(req.body.coupon_id, 10);
  if (!couponId) return res.status(400).json({ error: 'ກະລຸນາເລືອກຄູປອງ' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // ລັອກແຖວລູກຄ້າ ກັນກົດແລກຊ້ອນກັນຈົນແຕ້ມຕິດລົບ
    await conn.query('SELECT id FROM customers WHERE id = ? FOR UPDATE', [req.customerId]);

    const [cr] = await conn.query('SELECT * FROM coupons WHERE id = ? AND active = 1', [couponId]);
    const coupon = cr[0];
    if (!coupon) {
      await conn.rollback();
      return res.status(404).json({ error: 'ບໍ່ພົບຄູປອງນີ້' });
    }

    const balance = await getBalance(conn, req.customerId);
    if (balance < coupon.points_cost) {
      await conn.rollback();
      return res.status(400).json({ error: 'ແຕ້ມບໍ່ພໍສຳລັບແລກຄູປອງນີ້' });
    }

    await conn.query(
      `INSERT INTO points_ledger (customer_id, points, type, note) VALUES (?, ?, 'redeem', ?)`,
      [req.customerId, -coupon.points_cost, `ແລກຄູປອງ: ${coupon.name}`]
    );
    await conn.query(
      `INSERT INTO user_coupons (customer_id, coupon_id, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [req.customerId, coupon.id, coupon.valid_days]
    );

    await conn.commit();
    res.json({ success: true, points: balance - coupon.points_cost });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'ແລກຄູປອງບໍ່ສຳເລັດ' });
  } finally {
    conn.release();
  }
});

// ===== ແອດມິນ (ຈັດການລາຍການຄູປອງທີ່ໃຫ້ແລກ) =====

function parseCouponBody(b) {
  const type = b.type;
  const value = parseInt(b.value, 10);
  const points_cost = parseInt(b.points_cost, 10);
  const min_order = parseInt(b.min_order, 10) || 0;
  const valid_days = parseInt(b.valid_days, 10) || 30;
  const max_discount = b.max_discount ? parseInt(b.max_discount, 10) : null;
  const name = String(b.name || '').trim();

  if (!name) return { error: 'ກະລຸນາໃສ່ຊື່ຄູປອງ' };
  if (!['percent', 'fixed'].includes(type)) return { error: 'ປະເພດຄູປອງບໍ່ຖືກຕ້ອງ' };
  if (!(value > 0)) return { error: 'ມູນຄ່າຕ້ອງຫຼາຍກວ່າ 0' };
  if (type === 'percent' && value > 100) return { error: 'ເປີເຊັນຕ້ອງບໍ່ເກີນ 100' };
  if (!(points_cost > 0)) return { error: 'ແຕ້ມທີ່ໃຊ້ແລກຕ້ອງຫຼາຍກວ່າ 0' };
  return { data: { name, type, value, points_cost, min_order, valid_days, max_discount } };
}

router.get('/admin/list', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coupons ORDER BY id DESC');
    res.json({ coupons: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫລດບໍ່ສຳເລັດ' });
  }
});

router.post('/admin', requireAuth, async (req, res) => {
  const { data, error } = parseCouponBody(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const [r] = await pool.query(
      `INSERT INTO coupons (name, type, value, min_order, max_discount, points_cost, valid_days)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, data.value, data.min_order, data.max_discount, data.points_cost, data.valid_days]
    );
    res.json({ id: r.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ສ້າງຄູປອງບໍ່ສຳເລັດ' });
  }
});

async function updateCoupon(req, res) {
  const { data, error } = parseCouponBody(req.body);
  if (error) return res.status(400).json({ error });
  const active = req.body.active === 0 || req.body.active === false ? 0 : 1;
  try {
    await pool.query(
      `UPDATE coupons SET name=?, type=?, value=?, min_order=?, max_discount=?,
         points_cost=?, valid_days=?, active=? WHERE id=?`,
      [data.name, data.type, data.value, data.min_order, data.max_discount,
       data.points_cost, data.valid_days, active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ແກ້ໄຂບໍ່ສຳເລັດ' });
  }
}
router.put('/admin/:id', requireAuth, updateCoupon);
router.post('/admin/:id/update', requireAuth, updateCoupon);

module.exports = router;