// Route ສຳລັບ login/ສະໝັກລູກຄ້າດ້ວຍເບີໂທ + PIN
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = require('../jwtSecret');

// ເຊັກວ່າເບີໂທນີ້ເຄີຍສະໝັກແລ້ວບໍ່ (ໃຊ້ຕອນເລີ່ມ checkout step 2)
router.post('/check-phone', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  res.json({ exists: !!customer });
});

// ສະໝັກສະມາຊິກໃໝ່ (ເບີໂທ + PIN + ຊື່)
router.post('/register', async (req, res) => {
  const { phone, pin, name } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ ແລະ PIN' });
  }
  if (pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'PIN ຕ້ອງມີ 4-6 ໂຕເລກ' });
  }

  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: 'ເບີໂທນີ້ສະໝັກແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບແທນ' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const result = db.prepare(
    'INSERT INTO customers (phone, pin_hash, name) VALUES (?, ?, ?)'
  ).run(phone, pinHash, name || null);

  const customerId = result.lastInsertRowid;
  const token = jwt.sign({ customerId }, JWT_SECRET, { expiresIn: '90d' });

  res.cookie('customer_token', token, {
    httpOnly: true,
    maxAge: 90 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, customerId });
});

// ເຂົາສູ່ລະບົບດ້ວຍເບີໂທ + PIN ເດີມ
router.post('/login', async (req, res) => {
  const { phone, pin } = req.body;

  if (!phone || !pin) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ ແລະ PIN' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບເບີໂທນີ້ໃນລະບບ' });
  }

  const match = await bcrypt.compare(pin, customer.pin_hash);
  if (!match) {
    return res.status(401).json({ error: 'PIN ບໍ່ຖືກຕ້ອງ' });
  }

  const token = jwt.sign({ customerId: customer.id }, JWT_SECRET, { expiresIn: '90d' });

  res.cookie('customer_token', token, {
    httpOnly: true,
    maxAge: 90 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, customerId: customer.id });
});

// ອອກຈາກລະບົບ
router.post('/logout', (req, res) => {
  res.clearCookie('customer_token');
  res.json({ success: true });
});

module.exports = router;