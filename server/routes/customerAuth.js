// Route ສຳລັບ login/ສະໝັກລູກຄ້າດ້ວຍເບີໂທ + PIN
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const JWT_SECRET = require('../jwtSecret');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// ເຊັກວ່າເບີໂທນີ້ເຄີຍສະໝັກແລ້ວບໍ່ (ໃຊ້ຕອນເລີ່ມ checkout step 2)
router.post('/check-phone', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນເບີໂທ' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  res.json({ exists: !!customer });
});

// ✅ ສະໝັກສະມາຊິກໃໝ່ (ເບີໂທ + PIN + ຊື່ + ວັນເດືອນປີເກີດ)
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

  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: 'ເບີໂທນີ້ສະໝັກແລ້ວ ກະລຸນາເຂົ້າສູ່ລະບົບແທນ' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const result = db.prepare(
    'INSERT INTO customers (phone, pin_hash, name, birth_date) VALUES (?, ?, ?, ?)'
  ).run(phone, pinHash, name || null, birth_date);

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

// ✅ ລືມ PIN — ຢືນຢັນຕົວຕົນດ້ວຍເບີໂທ+ວັນເດືອນປີເກີດ ແລ້ວຕັ້ງ PIN ໃໝ່ໄດ້ເລີຍ (ບໍ່ຕ້ອງຜ່ານແອດມິນ)
router.post('/forgot-pin', async (req, res) => {
  const { phone, birth_date, new_pin } = req.body;

  if (!phone || !birth_date || !new_pin) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ' });
  }
  if (new_pin.length < 4 || new_pin.length > 6) {
    return res.status(400).json({ error: 'PIN ໃໝ່ຕ້ອງມີ 4-6 ໂຕເລກ' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບເບີໂທນີ້ໃນລະບົບ' });
  }

  // ➕ ຖ້າບັນຊີເກົ່າຍັງບໍ່ມີ birth_date ບັນທຶກໄວ້ (ສະໝັກກ່ອນຈະມີຄໍລຳນີ້) ຈະຮີເຊັດເອງບໍ່ໄດ້ ຕ້ອງພົວພັນຮ້ານ
  if (!customer.birth_date) {
    return res.status(400).json({
      error: 'ບັນຊີນີ້ຍັງບໍ່ໄດ້ບັນທຶກວັນເດືອນປີເກີດ ກະລຸນາຕິດຕໍ່ຮ້ານໂດຍກົງເພື່ອຣີເຊັດ PIN'
    });
  }

  if (customer.birth_date !== birth_date) {
    return res.status(401).json({ error: 'ວັນເດືອນປີເກີດບໍ່ຕົງກັບຂໍ້ມູນທີ່ບັນທຶກໄວ້' });
  }

  const newPinHash = await bcrypt.hash(new_pin, 10);
  db.prepare('UPDATE customers SET pin_hash = ? WHERE id = ?').run(newPinHash, customer.id);

  res.json({ success: true, message: 'ຕັ້ງ PIN ໃໝ່ສຳເລັດ ກະລຸນາເຂົ້າສູ່ລະບົບດ້ວຍ PIN ໃໝ່' });
});

// ອອກຈາກລະບົບ
router.post('/logout', (req, res) => {
  res.clearCookie('customer_token');
  res.json({ success: true });
});

// ດຶງຂໍ້ມູນລູກຄ້າທີ່ login ຢູ່ປັດຈຸບັນ (ໃຊ້ເຊັກສະຖານະຕອນໂຫລດໜ້າ)
router.get('/me', requireCustomerAuth, (req, res) => {
  const customer = db.prepare('SELECT id, phone, name FROM customers WHERE id = ?').get(req.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບຂໍ້ມູນລູກຄ້າ' });
  }
  res.json({ customerId: customer.id, phone: customer.phone, name: customer.name });
});

module.exports = router;