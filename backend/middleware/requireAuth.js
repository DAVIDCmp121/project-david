const jwt = require('jsonwebtoken');
const JWT_SECRET = require('../jwtSecret');

// อ่าน token จาก Authorization header ก่อน (Bearer) ถ้าไม่มีให้ลอง cookie
function getToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies ? req.cookies.token : undefined;
}

// ตรวจว่าล็อกอินเป็น "แอดมินหรือพนักงาน" เท่านั้น (token ลูกค้าไม่ผ่าน)
function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Session ໝົດອາຍຸ ກະລຸນາເຂົ້າສູ່ລະບົບໃໝ່' });
  }

  // token ลูกค้ามี customerId / token แอดมินต้องมี id และ role ที่รู้จัก
  const isStaffToken =
    !decoded.customerId && decoded.id && ['admin', 'staff'].includes(decoded.role);
  if (!isStaffToken) {
    return res.status(403).json({ error: 'ບໍ່ມີສິດເຂົ້າເຖິງສ່ວນນີ້' });
  }

  req.admin = decoded;
  next();
}

module.exports = requireAuth;