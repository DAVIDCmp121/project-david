// Middleware ກວດສອບວ່າລູກຄ້າ login ຢູ່ຫຼືບໍ (ໃຊ້ token ໃນ cookie)
const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../jwtSecret');

function requireCustomerAuth(req, res, next) {
  const token = req.cookies.customer_token;

  if (!token) {
    return res.status(401).json({ error: 'ກະລຸນາເຂົ້າສລະບົບກ່ອນ' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.customerId = decoded.customerId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ' });
  }
}

module.exports = requireCustomerAuth;