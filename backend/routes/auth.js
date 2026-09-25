const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const router = express.Router();

const JWT_SECRET = require('../jwtSecret');
const { checkLocked, recordFailure, clearAttempts } = require('../utils/ratelimiter');

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd
};

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

    res.cookie('token', token, COOKIE_OPTIONS);
    // ✅ ໃໝ່: ສົ່ງ token ກັບໄປໃນ response body ນຳ
    res.json({ success: true, name: admin.name, role: admin.role || 'admin', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ເຂາລະບົບບສເລັດ' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true });
});

// ✅ ອັບເດດ: ອ່ານ token ຈາກ Authorization header ກ່ອນ, ຖ້າບໍ່ມີໃຫ້ລອງ cookie
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.cookies.token;

  if (!token) return res.status(401).json({ error: 'ยงไม่ได้ login' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role || 'admin' });
  } catch {
    res.status(401).json({ error: 'session หมดอายุ' });
  }
});

module.exports = router;