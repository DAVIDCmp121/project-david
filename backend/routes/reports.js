const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');

// ວັນທີປັດຈຸບັນຕາມເວລາລາວ (UTC+7) ຮູບແບບ YYYY-MM-DD
function laoToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

// ບວກ/ລົບວັນໃສ່ສະຕຣິງ YYYY-MM-DD (ໃຊ້ UTC ກັນບັນຫາ timezone)
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// ສະເພາະແອດມິນເທົ່ານັ້ນ (ຖ້າ token ບໍ່ມີ role ຖືວ່າເປັນແອດມິນ ຄືກັບ AdminLayout)
function requireAdminRole(req, res, next) {
  const role = req.admin && req.admin.role;
  if (role && role !== 'admin') {
    return res.status(403).json({ error: 'ສະເພາະແອດມິນເທົ່ານັ້ນ' });
  }
  next();
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ສະຫຼຸບຍອດຂາຍ: GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/summary', requireAuth, requireAdminRole, async (req, res) => {
  try {
    let from = String(req.query.from || '');
    let to = String(req.query.to || '');
    const today = laoToday();
    if (!DATE_RE.test(to)) to = today;
    if (!DATE_RE.test(from)) from = addDays(to, -6);
    if (from > to) [from, to] = [to, from];

    const spanDays = Math.round(
      (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000
    ) + 1;
    if (spanDays > 366) {
      return res.status(400).json({ error: 'ເລືອກຊ່ວງວັນໄດ້ສູງສຸດ 366 ວັນ' });
    }

    const dayExpr = `DATE(CONVERT_TZ(o.created_at, '+00:00', '+07:00'))`;

    // 1) ລາຍບິນ (ບໍ່ນັບບິນທີ່ຍົກເລີກ): ຍອດສິນຄ້າ, ຈຳນວນຊິ້ນ, ສ່ວນລົດ
    const [orders] = await pool.query(
      `SELECT o.id, o.channel, o.payment_method, o.discount_amount,
              DATE_FORMAT(${dayExpr}, '%Y-%m-%d') AS d,
              SUM(oi.price_at_order * oi.quantity) AS subtotal,
              SUM(oi.quantity) AS qty
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.order_status <> 'cancelled'
         AND ${dayExpr} BETWEEN ? AND ?
       GROUP BY o.id, o.channel, o.payment_method, o.discount_amount, d`,
      [from, to]
    );

    const channels = {
      online: { revenue: 0, bills: 0, pieces: 0 },
      store: { revenue: 0, bills: 0, pieces: 0 },
    };
    const dailyMap = {};
    for (let i = 0; i < spanDays; i++) {
      dailyMap[addDays(from, i)] = { date: addDays(from, i), online: 0, store: 0 };
    }
    const payMap = {};

    for (const o of orders) {
      const ch = o.channel === 'store' ? 'store' : 'online';
      const revenue = Number(o.subtotal) - Number(o.discount_amount || 0);
      channels[ch].revenue += revenue;
      channels[ch].bills += 1;
      channels[ch].pieces += Number(o.qty);
      if (dailyMap[o.d]) dailyMap[o.d][ch] += revenue;

      const key = `${ch}|${o.payment_method || 'transfer'}`;
      if (!payMap[key]) payMap[key] = { channel: ch, method: o.payment_method || 'transfer', revenue: 0, bills: 0 };
      payMap[key].revenue += revenue;
      payMap[key].bills += 1;
    }

    const total = {
      revenue: channels.online.revenue + channels.store.revenue,
      bills: channels.online.bills + channels.store.bills,
      pieces: channels.online.pieces + channels.store.pieces,
    };

    // 2) ສິນຄ້າຂາຍດີ (ຍອດກ່ອນຫັກສ່ວນລົດທັງບິນ)
    const [items] = await pool.query(
      `SELECT oi.product_id, p.name, o.channel,
              SUM(oi.quantity) AS qty,
              SUM(oi.price_at_order * oi.quantity) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.order_status <> 'cancelled'
         AND ${dayExpr} BETWEEN ? AND ?
       GROUP BY oi.product_id, p.name, o.channel`,
      [from, to]
    );
    const topMap = {};
    for (const r of items) {
      if (!topMap[r.product_id]) {
        topMap[r.product_id] = { product_id: r.product_id, name: r.name, online_qty: 0, store_qty: 0, qty: 0, revenue: 0 };
      }
      const t = topMap[r.product_id];
      if (r.channel === 'store') t.store_qty += Number(r.qty);
      else t.online_qty += Number(r.qty);
      t.qty += Number(r.qty);
      t.revenue += Number(r.revenue);
    }
    const top = Object.values(topMap)
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 10);

    // 3) ຍອດຂາຍໜ້າຮ້ານແຍກຕາມພະນັກງານ (ຈາກ staff_id ໃນປະຫວັດສະຕັອກຂອງບິນ)
    const [staffRows] = await pool.query(
      `SELECT x.staff_id, a.name AS staff_name, x.id AS order_id,
              x.subtotal - x.discount_amount AS revenue
       FROM (
         SELECT o.id, o.discount_amount,
                SUM(oi.price_at_order * oi.quantity) AS subtotal,
                (SELECT MAX(sm.staff_id) FROM stock_movements sm
                  WHERE sm.order_id = o.id AND sm.channel = 'store') AS staff_id
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE o.channel = 'store' AND o.order_status <> 'cancelled'
           AND ${dayExpr} BETWEEN ? AND ?
         GROUP BY o.id, o.discount_amount
       ) x
       LEFT JOIN admins a ON a.id = x.staff_id`,
      [from, to]
    );
    const staffMap = {};
    for (const r of staffRows) {
      const key = r.staff_id || 0;
      if (!staffMap[key]) {
        staffMap[key] = { staff_id: key, name: r.staff_name || 'ບໍ່ລະບຸ', bills: 0, revenue: 0 };
      }
      staffMap[key].bills += 1;
      staffMap[key].revenue += Number(r.revenue);
    }
    const staff = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue);

    res.json({
      from,
      to,
      total,
      channels,
      daily: Object.values(dailyMap),
      payments: Object.values(payMap),
      top,
      staff,
    });
  } catch (err) {
    console.error('REPORT ERROR:', err);
    res.status(500).json({ error: 'ດຶງລາຍງານບໍ່ສຳເລັດ' });
  }
});

module.exports = router;