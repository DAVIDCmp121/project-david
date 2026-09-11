const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = require('../jwtSecret');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter'); // ➕

// ✅ ตัวเลือก cookie กลาง ใช้รวมกันทกจดที่ตง/ลบ cookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'none',
  secure: true
};

router.post('/check-phone', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'ກະລນາປອນເບໂທ' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  res.json({ exists: !!customer });
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

  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: 'ເບໂທນສະໝກແລວ ກະລນາເຂາສລະບບແທນ' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const result = db.prepare(
    'INSERT INTO customers (phone, pin_hash, name, birth_date) VALUES (?, ?, ?, ?)'
  ).run(phone, pinHash, name || null, birth_date);

  const customerId = result.lastInsertRowid;
  const token = jwt.sign({ customerId }, JWT_SECRET, { expiresIn: '90d' });

  res.cookie('customer_token', token, {
    ...COOKIE_OPTIONS,
    maxAge: 90 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, customerId });
});

// ✅ ເຂົາສລະບບ — ເພມການກນເດາ PIN ຊໆ
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

  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
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

  res.json({ success: true, customerId: customer.id });
});

// ✅ ລມ PIN — ເພມການກນເດວນເກດຊ້ໆ
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

  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
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
  db.prepare('UPDATE customers SET pin_hash = ? WHERE id = ?').run(newPinHash, customer.id);

  res.json({ success: true, message: 'ຕງ PIN ໃໝ່ສເລດ ກະລນາເຂົາສລະບບດວຍ PIN ໃໝ່' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('customer_token', COOKIE_OPTIONS);
  res.json({ success: true });
});

router.get('/me', requireCustomerAuth, (req, res) => {
  const customer = db.prepare('SELECT id, phone, name FROM customers WHERE id = ?').get(req.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'ບພບຂມນລກຄາ' });
  }
  res.json({ customerId: customer.id, phone: customer.phone, name: customer.name });
});

module.exports = router;