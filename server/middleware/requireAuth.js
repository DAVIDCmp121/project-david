const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../jwtSecret');

// ຟງຊັນນີ້ໃຊ້ກວດສອບກ່ອນເຂົ້າ API ທີ່ຕ້ອງການສິດແອດມິນ
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next(); // ຜ່ານ ໃຫ້ໄປຕ
  } catch (err) {
    res.status(401).json({ error: 'Session ໝົດອາຍ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
  }
}

module.exports = requireAuth;