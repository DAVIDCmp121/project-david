const { pool } = require('../db');

// 1 แต้มต่อทุก 10,000 กีบที่จ่ายจริง (หลังหักคูปอง) — ปรับตรงนี้ที่เดียว
const POINT_UNIT = 10000;

function computeDiscount(coupon, subtotal) {
  if (!coupon || subtotal < Number(coupon.min_order)) return 0;
  let d = coupon.type === 'percent'
    ? Math.floor((subtotal * Number(coupon.value)) / 100)
    : Number(coupon.value);
  if (coupon.type === 'percent' && coupon.max_discount) {
    d = Math.min(d, Number(coupon.max_discount));
  }
  return Math.min(d, subtotal);
}

// db = pool หรือ connection ก็ได้
async function getBalance(db, customerId) {
  const [rows] = await db.query(
    'SELECT COALESCE(SUM(points), 0) AS p FROM points_ledger WHERE customer_id = ?',
    [customerId]
  );
  return Number(rows[0].p);
}

// ให้แต้มเมื่อออเดอร์ "รอดแล้ว" (UNIQUE KEY กันได้ซ้ำ)
async function awardPointsForOrder(orderId) {
  const [rows] = await pool.query(
    `SELECT o.customer_id, o.discount_amount,
            COALESCE(SUM(oi.price_at_order * oi.quantity), 0) AS subtotal
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = ?
     GROUP BY o.id, o.customer_id, o.discount_amount`,
    [orderId]
  );
  const o = rows[0];
  if (!o || !o.customer_id) return 0;

  const paid = Number(o.subtotal) - Number(o.discount_amount || 0);
  const points = Math.floor(paid / POINT_UNIT);
  if (points <= 0) return 0;

  await pool.query(
    `INSERT IGNORE INTO points_ledger (customer_id, order_id, points, type, note)
     VALUES (?, ?, ?, 'earn', ?)`,
    [o.customer_id, orderId, points, `ໄດ້ແຕ້ມຈາກອໍເດີ #${orderId}`]
  );
  return points;
}

// ยกเลิกออเดอร์: คืนคูปอง + หักแต้มที่เคยได้จากออเดอร์นี้
async function reverseOrderBenefits(orderId) {
  await pool.query(
    `UPDATE user_coupons SET status = 'available', used_order_id = NULL
     WHERE used_order_id = ?`,
    [orderId]
  );
  const [earn] = await pool.query(
    `SELECT customer_id, points FROM points_ledger WHERE order_id = ? AND type = 'earn'`,
    [orderId]
  );
  if (earn[0]) {
    await pool.query(
      `INSERT IGNORE INTO points_ledger (customer_id, order_id, points, type, note)
       VALUES (?, ?, ?, 'adjust', ?)`,
      [earn[0].customer_id, orderId, -earn[0].points, `ຍົກເລີກອໍເດີ #${orderId}`]
    );
  }
}

module.exports = {
  POINT_UNIT, computeDiscount, getBalance, awardPointsForOrder, reverseOrderBenefits,
};