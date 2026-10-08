const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
};

const MAX_ADDRESSES = 5;
const SERVER_ERROR = 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່';

router.use(requireCustomerAuth);

/* ---------- helpers ---------- */
async function withTx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ກວດ PIN ປັດຈຸບັນ + ກັນເດົາ PIN (ສົ່ງ response ເອງເມື່ອບໍ່ຜ່ານ)
async function checkPin(req, res, action, pin) {
  const lockKey = `${action}:${req.customerId}`;
  const lock = checkLocked(lockKey);
  if (lock.locked) {
    res.status(429).json({
      error: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ໃນ ${lock.secondsLeft} ວິນາທີ`,
    });
    return false;
  }
  const [rows] = await pool.query('SELECT pin_hash FROM customers WHERE id = ?', [req.customerId]);
  const ok = rows[0] && pin && (await bcrypt.compare(String(pin), rows[0].pin_hash));
  if (!ok) {
    recordFailure(lockKey);
    res.status(401).json({ error: 'PIN ບໍ່ຖືກຕ້ອງ' });
    return false;
  }
  clearAttempts(lockKey);
  return true;
}

function cleanAddress(body) {
  return {
    label: String(body.label || '').trim().slice(0, 50),
    address: String(body.address || '').trim().slice(0, 500),
  };
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  return d.getUTCFullYear() >= 1900 && d <= new Date();
}

/* ---------- ທີ່ຢູ່ຈັດສົ່ງ ---------- */
router.get('/addresses', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, label, address, is_default FROM customer_addresses
       WHERE customer_id = ? ORDER BY is_default DESC, id DESC`,
      [req.customerId]
    );
    res.json({ success: true, addresses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

router.post('/addresses', async (req, res) => {
  const { label, address } = cleanAddress(req.body);
  if (!address) return res.status(400).json({ error: 'ກະລຸນາປ້ອນທີ່ຢູ່' });

  try {
    const out = await withTx(async (conn) => {
      const [[row]] = await conn.query(
        'SELECT COUNT(*) AS c FROM customer_addresses WHERE customer_id = ?',
        [req.customerId]
      );
      const count = Number(row.c);
      if (count >= MAX_ADDRESSES) {
        return { error: `ບັນທຶກໄດ້ສູງສຸດ ${MAX_ADDRESSES} ທີ່ຢູ່` };
      }
      const makeDefault = count === 0 || req.body.is_default ? 1 : 0;
      if (makeDefault) {
        await conn.query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [
          req.customerId,
        ]);
      }
      const [r] = await conn.query(
        'INSERT INTO customer_addresses (customer_id, label, address, is_default) VALUES (?, ?, ?, ?)',
        [req.customerId, label || null, address, makeDefault]
      );
      return { id: r.insertId };
    });
    if (out.error) return res.status(400).json(out);
    res.json({ success: true, id: out.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

router.put('/addresses/:id', async (req, res) => {
  const { label, address } = cleanAddress(req.body);
  if (!address) return res.status(400).json({ error: 'ກະລຸນາປ້ອນທີ່ຢູ່' });

  try {
    const [rows] = await pool.query(
      'SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ?',
      [req.params.id, req.customerId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'ບໍ່ພົບທີ່ຢູ່ນີ້' });

    await pool.query('UPDATE customer_addresses SET label = ?, address = ? WHERE id = ?', [
      label || null,
      address,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

router.post('/addresses/:id/default', async (req, res) => {
  try {
    const found = await withTx(async (conn) => {
      const [rows] = await conn.query(
        'SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ?',
        [req.params.id, req.customerId]
      );
      if (!rows[0]) return false;
      await conn.query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [
        req.customerId,
      ]);
      await conn.query('UPDATE customer_addresses SET is_default = 1 WHERE id = ?', [req.params.id]);
      return true;
    });
    if (!found) return res.status(404).json({ error: 'ບໍ່ພົບທີ່ຢູ່ນີ້' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

router.delete('/addresses/:id', async (req, res) => {
  try {
    const found = await withTx(async (conn) => {
      const [rows] = await conn.query(
        'SELECT id, is_default FROM customer_addresses WHERE id = ? AND customer_id = ?',
        [req.params.id, req.customerId]
      );
      if (!rows[0]) return false;
      await conn.query('DELETE FROM customer_addresses WHERE id = ?', [req.params.id]);
      if (rows[0].is_default) {
        await conn.query(
          `UPDATE customer_addresses SET is_default = 1
           WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
          [req.customerId]
        );
      }
      return true;
    });
    if (!found) return res.status(404).json({ error: 'ບໍ່ພົບທີ່ຢູ່ນີ້' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

/* ---------- ວັນເກີດ (ໃຊ້ຢືນຢັນຕອນລືມ PIN) ---------- */
router.get('/birth-date', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date FROM customers WHERE id = ?",
      [req.customerId]
    );
    res.json({ success: true, birth_date: (rows[0] && rows[0].birth_date) || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

router.post('/birth-date', async (req, res) => {
  const birthDate = String(req.body.birth_date || '');
  if (!validDate(birthDate)) {
    return res.status(400).json({ error: 'ວັນເກີດບໍ່ຖືກຕ້ອງ' });
  }
  try {
    if (!(await checkPin(req, res, 'birth-date', req.body.pin))) return;
    await pool.query('UPDATE customers SET birth_date = ? WHERE id = ?', [birthDate, req.customerId]);
    res.json({ success: true, birth_date: birthDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

/* ---------- ປ່ຽນ PIN ---------- */
router.post('/change-pin', async (req, res) => {
  const current = String(req.body.current_pin || '');
  const next = String(req.body.new_pin || '');

  if (!/^\d{4,6}$/.test(next)) {
    return res.status(400).json({ error: 'PIN ໃໝ່ຕ້ອງເປັນຕົວເລກ 4-6 ໂຕ' });
  }
  if (next === current) {
    return res.status(400).json({ error: 'PIN ໃໝ່ຕ້ອງບໍ່ຄືກັບ PIN ເກົ່າ' });
  }
  try {
    if (!(await checkPin(req, res, 'change-pin', current))) return;
    const hash = await bcrypt.hash(next, 10);
    await pool.query('UPDATE customers SET pin_hash = ? WHERE id = ?', [hash, req.customerId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

/* ---------- ລຶບບັນຊີ ---------- */
// ລຶບຂໍ້ມູນສ່ວນຕົວ (ທີ່ຢູ່, ຖືກໃຈ, ກະຕ່າ, ແຊັດ, ຄູປອງ, ແຕ້ມ) ແລະ ປ່ຽນແຖວລູກຄ້າເປັນບັນຊີວ່າງ
// ແຕ່ຍັງເກັບປະຫວັດອໍເດີໄວ້ໃຫ້ຮ້ານ
router.post('/delete', async (req, res) => {
  try {
    if (!(await checkPin(req, res, 'delete-account', req.body.pin))) return;

    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS c FROM orders
       WHERE customer_id = ? AND order_status IN ('awaiting_review', 'confirmed', 'shipped')`,
      [req.customerId]
    );
    if (Number(pending.c) > 0) {
      return res.status(400).json({
        error: 'ມີອໍເດີທີ່ຍັງບໍ່ສຳເລັດ ກະລຸນາລໍຖ້າໃຫ້ອໍເດີສຳເລັດກ່ອນລຶບບັນຊີ',
      });
    }

    const randomHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const id = req.customerId;

    await withTx(async (conn) => {
      await conn.query('DELETE FROM customer_addresses WHERE customer_id = ?', [id]);
      await conn.query('DELETE FROM favorites WHERE customer_id = ?', [id]);
      await conn.query('DELETE FROM cart_items WHERE customer_id = ?', [id]);
      await conn.query('DELETE FROM messages WHERE customer_id = ?', [id]);
      await conn.query('DELETE FROM user_coupons WHERE customer_id = ?', [id]);
      await conn.query('DELETE FROM points_ledger WHERE customer_id = ?', [id]);
      await conn.query(
        `UPDATE customers
         SET phone = ?, pin_hash = ?, name = NULL, birth_date = NULL, deleted_at = NOW()
         WHERE id = ?`,
        [`deleted_${id}`, randomHash, id]
      );
    });

    res.clearCookie('customer_token', COOKIE_OPTIONS);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: SERVER_ERROR });
  }
});

module.exports = router;