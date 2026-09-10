const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = require('../jwtSecret');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter');

// ✅ ເຂົ້າສູ່ລະບົບແອດມິນ/ພະນັກງານ — ເພີ່ມການກັນເດລະຫັດຜ່ານຊ້ຳໆ
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const lockKey = `admin-login:${username}`;
  const lockStatus = checkLocked(lockKey);
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ໃນ ${lockStatus.secondsLeft} ວິນາທີ`
    });
  }

  const admin = db.prepare(`SELECT * FROM admins WHERE username = ?`).get(username);
  if (!admin) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
  }

  const match = bcrypt.compareSync(password, admin.password);
  if (!match) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
  }

  clearAttempts(lockKey);

  const token = jwt.sign(
    { id: admin.id, username: admin.username, name: admin.name, role: admin.role || 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.cookie('token', token, {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production'
});
  res.json({ success: true, name: admin.name, role: admin.role || 'admin' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'ยังไม่ได้ login' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role || 'admin' });
  } catch {
    res.status(401).json({ error: 'session หมดอายุ' });
  }
});

module.exports = router;