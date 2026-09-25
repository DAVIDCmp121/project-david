const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../jwtSecret');

// ✅ ອັບເດດ: ອ່ານ token ຈາກ Authorization header ກ່ອນ (Bearer), ຖ້າບໍ່ມີໃຫ້ລອງ cookie ເປັນ fallback
function getToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies ? req.cookies.token : undefined;
}

// ຟັງຊັນກວດສອບການເຂົ້າສູ່ລະບົບກ່ອນເຂົ້າ API ທີ່ຕ້ອງການສິດແອດມິນ
function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded; // ftedeleted ພາກສ່ວນຄືນ login ໄວ້ໃຫ້ route ຕໍ່ໄປໃຊ້ (ລວມທັງ role)
    next(); // ຜ່ານ ໃຫ້ໄປຕໍ່
  } catch (err) {
    res.status(401).json({ error: 'Session ໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
  }
}

module.exports = requireAuth;