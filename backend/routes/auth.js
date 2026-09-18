const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const router = express.Router();

const JWT_SECRET = require('../jwtSecret');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter');

// ✅ ตัวเลอก cookie กลาง ใช้ร่วมกนทกจุดที่ตง/ลบ cookie
const isProd = process.env.NODE_ENV === 'production';
console.log('🔍 DEBUG isProd =', isProd, '| NODE_ENV =', process.env.NODE_ENV);

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd
};
console.log('🔍 DEBUG COOKIE_OPTIONS =', COOKIE_OPTIONS);

// ✅ ເຂາສລະບບແອດມນ/ພະນກງານ — ເພມການກນເດລະຫດຜານຊໆ
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const lockKey = `admin-login:${username}`;
    const lockStatus = checkLocked(lockKey);
    if (lockStatus.locked) {
      return res.status(429).json({
        error: `ພະຍາຍາມຫາຍເກນໄປ ກະລນາລອງໃໝໃນ ${lockStatus.secondsLeft} ວນາທີ`
      });
    }

    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    const admin = rows[0];
    if (!admin) {
      recordFailure(lockKey);
      return res.status(401).json({ error: 'ຊືຜໃຊ ຫ ລະຫດຜ່ານບຖກຕອງ' });
    }

    const match = bcrypt.compareSync(password, admin.password);
    if (!match) {
      recordFailure(lockKey);
      return res.status(401).json({ error: 'ຊືຜໃຊ ຫ ລະຫັດຜານບຖືກຕອງ' });
    }

    clearAttempts(lockKey);

    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name, role: admin.role || 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log('🔍 DEBUG /login setting cookie with options:', COOKIE_OPTIONS);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ success: true, name: admin.name, role: admin.role || 'admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ເຂາລະບົບບສເລັດ' });
  }
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