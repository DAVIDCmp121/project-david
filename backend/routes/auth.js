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

    if (!username || !password) {
      return res.status(400).json({ error: 'ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ' });
    }

    const lockKey = `admin-login:${username}`;
    const lockStatus = checkLocked(lockKey);
    if (lockStatus.locked) {
      return res.status(429).json({
        error: `ພະຍາຍາມຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ໃນ ${lockStatus.secondsLeft} ວິນາທີ`,
        locked: true,
        seconds_left: lockStatus.secondsLeft
      });
    }

    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    const admin = rows[0];
    if (!admin) {
      recordFailure(lockKey);
      return res.status(401).json({ error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' });
    }

    const match = await bcrypt.compare(String(password), admin.password);
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

    res.cookie('token', token, COOKIE_OPTIONS);
    // ล็อกอินแอดมิน → เตะลูกค้าออก (ล้าง cookie ลูกค้า)
    res.clearCookie('customer_token', COOKIE_OPTIONS);
    // ສົ່ງ token ກັບໄປໃນ response body ນຳ
    res.json({ success: true, name: admin.name, role: admin.role || 'admin', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ເຂົ້າລະບົບບໍ່ສຳເລັດ' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true });
});

// ອ່ານ token ຈາກ Authorization header ກ່ອນ, ຖ້າບໍ່ມີໃຫ້ລອງ cookie
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.cookies.token;

  if (!token) return res.status(401).json({ error: 'ຍັງບໍ່ໄດ້ເຂົ້າສູ່ລະບົບ' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // token ลูกค้าไม่ใช่แอดมิน
    if (decoded.customerId || !decoded.id) {
      return res.status(401).json({ error: 'ບໍ່ແມ່ນບັນຊີແອດມິນ' });
    }
    res.json({ id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role || 'admin' });
  } catch {
    res.status(401).json({ error: 'ເຊດຊັນໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
  }
});

module.exports = router;