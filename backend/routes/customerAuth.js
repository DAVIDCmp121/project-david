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
    return res.status(400).json({ error: 'ກະລນາປອນເບໂທ' });
  }

  const [rows] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
  res.json({ exists: rows.length > 0 });
});

router.post('/register', async (req, res) => {
  const { phone, pin, name, birth_date } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'ກະລນາປອນເບໂທ ແລະ PIN' });
  }
  if (pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'PIN ຕ້ອງມີ 4-6 ໂຕເລກ' });
  }
  if (!birth_date) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນວັນເດືອນປີເກີດ (ໃຊຢນຢນຕວຕນເວລາລມ PIN)' });
  }

  const [existingRows] = await pool.query('SELECT id FROM customers WHERE phone = ?', [phone]);
  if (existingRows.length > 0) {
    return res.status(409).json({ error: 'ເບໂທນສະໝກແລວ ກະລນາເຂາສລະບບແທນ' });
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

  // ✅ ໃໝ່: ສົ່ງ token ກັບໄປໃນ response body ນຳ ເພື່ອໃຫ້ frontend ເກັບໄວ້ໃນ localStorage
  res.json({ success: true, customerId, token });
});

router.post('/login', async (req, res) => {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'ກະລນາປອນເບໂທ ແລະ PIN' });
  }

  const lockKey = `customer-login:${phone}`;
  const lockStatus = checkLocked(lockKey);
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `ພະຍາຍາມຫາຍເກນໄປ ກະລນາລອງໃໝໃນ ${lockStatus.secondsLeft} ວນາທ`
    });
  }

  const [rows] = await pool.query('SELECT * FROM customers WHERE phone = ?', [phone]);
  const customer = rows[0];
  if (!customer) {
    recordFailure(lockKey);
    return res.status(404).json({ error: 'ບພບເບໂທນໃນລະບບ' });
  }

  const match = await bcrypt.compare(pin, customer.pin_hash);
  if (!match) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'PIN ບຖກຕອງ' });
  }

  clearAttempts(lockKey);

  const token = jwt.sign({ customerId: customer.id }, JWT_SECRET, { expiresIn: '90d' });

  res.cookie('customer_token', token, {
    ...COOKIE_OPTIONS,
    maxAge: 90 * 24 * 60 * 60 * 1000
  });

  // ✅ ໃໝ່: ສົ່ງ token ກັບໄປໃນ response body
  res.json({ success: true, customerId: customer.id, token });
});

router.post('/forgot-pin', async (req, res) => {
  const { phone, birth_date, new_pin } = req.body;

  if (!phone || !birth_date || !new_pin) {
    return res.status(400).json({ error: 'ກະລນາປອນຂມນໃຫຄບ' });
  }
  if (new_pin.length < 4 || new_pin.length > 6) {
    return res.status(400).json({ error: 'PIN ໃໝ່ຕ້ອງມີ 4-6 ໂຕເລກ' });
  }

  const lockKey = `forgot-pin:${phone}`;
  const lockStatus = checkLocked(lockKey);
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `ພະຍາຍາມຫາຍເກນໄປ ກະລນາລອງໃໝ່ໃນ ${lockStatus.secondsLeft} ວນາທ`
    });
  }

  const [rows] = await pool.query('SELECT * FROM customers WHERE phone = ?', [phone]);
  const customer = rows[0];
  if (!customer) {
    recordFailure(lockKey);
    return res.status(404).json({ error: 'ບພບເບໂທນໃນລະບບ' });
  }

  if (!customer.birth_date) {
    return res.status(400).json({
      error: 'ບນຊນຍງບໄດບນທກວນເດອນປເກດ ກະລນາຕດຕຮານໂດຍກງເພອຣເຊດ PIN'
    });
  }

  if (customer.birth_date !== birth_date) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'ວນເດອນປເກດບຕງກບຂມນທບນທກໄວ' });
  }

  clearAttempts(lockKey);

  const newPinHash = await bcrypt.hash(new_pin, 10);
  await pool.query('UPDATE customers SET pin_hash = ? WHERE id = ?', [newPinHash, customer.id]);

  res.json({ success: true, message: 'ຕງ PIN ໃໝ່ສເລດ ກະລນາເຂາສລະບບດວຍ PIN ໃໝ່' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('customer_token', COOKIE_OPTIONS);
  res.json({ success: true });
});

router.get('/me', requireCustomerAuth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, phone, name FROM customers WHERE id = ?',
    [req.customerId]
  );
  const customer = rows[0];
  if (!customer) {
    return res.status(404).json({ error: 'ບພບຂມນລກຄາ' });
  }
  res.json({ customerId: customer.id, phone: customer.phone, name: customer.name });
});

module.exports = router;