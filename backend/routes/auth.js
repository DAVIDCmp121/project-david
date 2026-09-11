const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

const JWT_SECRET = require('../jwtSecret');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter');

// ✅ ตัวเลือก cookie กลาง ใช้ร่วมกันทุกจุดที่ตง/ลบ cookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'none',
  secure: true
};

// ✅ ເຂາສລະບບແອດມນ/ພະນັກງານ — ເພີມການກນເດລະຫັດຜ່ານຊ້ຳໆ
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const lockKey = `admin-login:${username}`;
  const lockStatus = checkLocked(lockKey);
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລນາລອງໃໝ່ໃນ ${lockStatus.secondsLeft} ວິນາທີ`
    });
  }

  const admin = db.prepare(`SELECT * FROM admins WHERE username = ?`).get(username);
  if (!admin) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'ຊື່ຜູໃຊ ຫ ລະຫັດຜ່ານບຖືກຕອງ' });
  }

  const match = bcrypt.compareSync(password, admin.password);
  if (!match) {
    recordFailure(lockKey);
    return res.status(401).json({ error: 'ຊືຜູໃຊ ຫຼ ລະຫັດຜ່ານບຖືກຕອງ' });
  }

  clearAttempts(lockKey);

  const token = jwt.sign(
    { id: admin.id, username: admin.username, name: admin.name, role: admin.role || 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({ success: true, name: admin.name, role: admin.role || 'admin' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'ยงไม่ได้ login' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role || 'admin' });
  } catch {
    res.status(401).json({ error: 'session หมดอายุ' });
  }
});

module.exports = router;