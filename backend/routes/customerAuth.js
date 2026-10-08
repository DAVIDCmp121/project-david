const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const JWT_SECRET = require('../jwtSecret');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter');

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd
};

router.post('/check-phone', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ' });
  }

  const [rows] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
  res.json({ exists: rows.length > 0 });
});

router.post('/register', async (req, res) => {
  const { phone, pin, name, birth_date } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ ແລະ PIN' });
  }
  if (pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'PIN ຕ້ອງມີ 4-6 ໂຕເລກ' });
  }
  if (!birth_date) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນວັນເດືອນປີເກີດ (ໃຊ້ຢືນຢັນຕົວຕົນເວລາລືມ PIN)' });
  }

  const [existingRows] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
  if (existingRows.length > 0) {
    return res.status(409).json({ error: 'ເບີໂທນີ້ສະໝັກແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບແທນ' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const [result] = await pool.query(
    'INSERT INTO customers (phone, pin_hash, name, birth_date) VALUES (?, ?, ?, ?)',
    [phone, pinHash, name || null, birth_date]
  );

  const customerId = result.insertId;
  const token = jwt.sign({ customerId }, JWT_SECRET, { expiresIn: '90d' });

  res.cookie('customer_token', token, {
    ...COOKIE_OPTIONS,
    maxAge: 90 * 24 * 60 * 60 * 1000
  });

  // ສົ່ງ token ກັບໄປໃນ response body ນຳ ເພື່ອໃຫ້ frontend ເກັບໄວ້ໃນ localStorage
  res.json({ success: true, customerId, token });
});

router.post('/login', async (req, res) => {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ ແລະ PIN' });
  }

  const lockKey = `customer-login:${phone}`;
  const lockStatus = checkLocked(lockKey);
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ໃນ ${lockStatus.secondsLeft} ວິນາທີ`
    });
  }

  const [rows] = await pool.query('SELECT * FROM customers WHERE phone = ?', [phone]);
  const customer = rows[0];
  if (!customer) {
    recordFailure(lockKey);
    return res.status(404).json({ error: 'ບໍ່ພົບເບີໂທນີ້ໃນລະບົບ' });
  }

  const match = await bcrypt.compare(pin, customer.pin_hash);
  if (!match) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'PIN ບໍ່ຖືກຕ້ອງ' });
  }

  clearAttempts(lockKey);

  const token = jwt.sign({ customerId: customer.id }, JWT_SECRET, { expiresIn: '90d' });

  res.cookie('customer_token', token, {
    ...COOKIE_OPTIONS,
    maxAge: 90 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, customerId: customer.id, token });
});

router.post('/forgot-pin', async (req, res) => {
  const { phone, birth_date, new_pin } = req.body;

  if (!phone || !birth_date || !new_pin) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ' });
  }
  if (new_pin.length < 4 || new_pin.length > 6) {
    return res.status(400).json({ error: 'PIN ໃໝ່ຕ້ອງມີ 4-6 ໂຕເລກ' });
  }

  const lockKey = `forgot-pin:${phone}`;
  const lockStatus = checkLocked(lockKey);
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ໃນ ${lockStatus.secondsLeft} ວິນາທີ`
    });
  }

  // ດຶງວັນເກີດເປັນຂໍ້ຄວາມ YYYY-MM-DD ເພື່ອປຽບທຽບໄດ້ຖືກຕ້ອງ
  // (ຖ້າບໍ່ແປງ mysql2 ຈະສົ່ງເປັນ Date object ເຮັດໃຫ້ປຽບທຽບກັບຂໍ້ຄວາມບໍ່ຕົງກັນ)
  const [rows] = await pool.query(
    "SELECT *, DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date_str FROM customers WHERE phone = ?",
    [phone]
  );
  const customer = rows[0];
  if (!customer) {
    recordFailure(lockKey);
    return res.status(404).json({ error: 'ບໍ່ພົບເບີໂທນີ້ໃນລະບົບ' });
  }

  if (!customer.birth_date_str) {
    return res.status(400).json({
      error: 'ບັນຊີນີ້ຍັງບໍ່ໄດ້ບັນທຶກວັນເດືອນປີເກີດ ກະລຸນາຕິດຕໍ່ຮ້ານໂດຍກົງເພື່ອຣີເຊັດ PIN'
    });
  }

  if (customer.birth_date_str !== birth_date) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'ວັນເດືອນປີເກີດບໍ່ຕົງກັບຂໍ້ມູນທີ່ບັນທຶກໄວ້' });
  }

  clearAttempts(lockKey);

  const newPinHash = await bcrypt.hash(new_pin, 10);
  await pool.query('UPDATE customers SET pin_hash = ? WHERE id = ?', [newPinHash, customer.id]);

  res.json({ success: true, message: 'ຕັ້ງ PIN ໃໝ່ສຳເລັດ ກະລຸນາເຂົ້າສູ່ລະບົບດ້ວຍ PIN ໃໝ່' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('customer_token', COOKIE_OPTIONS);
  res.json({ success: true });
});

router.get('/me', requireCustomerAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, phone, name, deleted_at FROM customers WHERE id = ?',
    [req.customerId]
  );
  const customer = rows[0];
  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນລູກຄ້າ' });
  }
  // ບັນຊີທີ່ຖືກລຶບແລ້ວ ໃຫ້ຖືວ່າອອກຈາກລະບົບ
  if (customer.deleted_at) {
    res.clearCookie('customer_token', COOKIE_OPTIONS);
    return res.status(401).json({ error: 'ບັນຊີນີ້ຖືກລຶບແລ້ວ' });
  }
  res.json({ customerId: customer.id, phone: customer.phone, name: customer.name });
});

router.post('/me/name', requireCustomerAuth, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຊື່' });
  }
  if (name.length > 30) {
    return res.status(400).json({ error: 'ຊື່ຍາວເກີນໄປ (ສູງສຸດ 30 ໂຕອັກສອນ)' });
  }
  await pool.query('UPDATE customers SET name = ? WHERE id = ?', [name, req.customerId]);
  res.json({ success: true, name });
});

module.exports = router;