// Middleware ตรวจสอบวาลูกค้า login อยู่ (ใช token จาก header ก่อน, fallback เป็น cookie)
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../jwtSecret');

function requireCustomerAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    token = req.cookies.customer_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'ກະລນາເຂາສູລະບົບກອນ' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.customerId = decoded.customerId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ບຖືກຕອງ ຫ ໝດອາຍ' });
  }
}

module.exports = requireCustomerAuth;