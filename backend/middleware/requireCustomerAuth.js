// Middleware ตรวจว่าลูกค้า login อยู่ไหม (ใช้ token จาก Authorization header หรือ cookie)
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../jwtSecret');

function requireCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : (req.cookies ? req.cookies.customer_token : undefined);

  if (!token) {
    return res.status(401).json({ error: 'ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // ต้องเป็น token ของลูกค้าจริง (token แอดมินไม่มี customerId)
    if (!decoded.customerId) {
      return res.status(401).json({ error: 'Token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ' });
    }
    req.customerId = decoded.customerId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ' });
  }
}

module.exports = requireCustomerAuth;