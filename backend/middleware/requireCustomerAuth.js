// Middleware ກວດສອບວ່າລູກຄ້າ login ຢູ່ບໍ (ໃຊ້ token ຈາກ Authorization header ຫຼື cookie)
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
    req.customerId = decoded.customerId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ' });
  }
}

module.exports = requireCustomerAuth;