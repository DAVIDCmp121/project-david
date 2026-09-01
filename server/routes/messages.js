// Route ຈັດການຂໍ້ຄວາມແຊດ ລະຫວ່າງລູກຄ້າ ແລະ ແອດມິນ
const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const cloudinary = require('../config/cloudinary');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const requireAuth = require('../middleware/requireAuth');

// ເກັບໄຟລ໌ໄວ້ໃນ memory ຊົ່ວຄາວ (ບໍ່ຂຽນລົງ disk) ແລ້ວສົ່ງຕໍ່ໃຫ້ Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // ຈຳກັດ 5MB ຕໍ່ຮູບ
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('ອະນຸຍາດສະເພາະໄຟລ໌ຮູບພາບເທົ່ານັ້ນ'));
    }
    cb(null, true);
  }
});

// ຟັງຊັນອັບໂຫລດ buffer ຂຶ້ນ Cloudinary (ໃຊ້ stream ເພາະ buffer ບໍ່ແມ່ນໄຟລ໌ບົນ disk)
function uploadToCloudinary(fileBuffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'project-david/chat' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

// ================== ຝັ່ງລູກຄ້າ ==================

// ລູກຄ້າ: ດຶງຂໍ້ຄວາມທັງໝົດຂອງຕົນເອງ
router.get('/', requireCustomerAuth, (req, res) => {
  const customerId = req.customerId;

  const messages = db.prepare(
    'SELECT * FROM messages WHERE customer_id = ? ORDER BY created_at ASC'
  ).all(customerId);

  // ໝາຍວ່າອ່ານແລ້ວ (ສະເພາະຂໍ້ຄວາມຈາກແອດມິນ)
  db.prepare(
    "UPDATE messages SET is_read = 1 WHERE customer_id = ? AND sender = 'admin' AND is_read = 0"
  ).run(customerId);

  res.json({ messages });
});

// ລູກຄ້າ: ສົ່ງຂໍ້ຄວາມ
router.post('/', requireCustomerAuth, (req, res) => {
  const customerId = req.customerId;
  const { message_text } = req.body;

  if (!message_text || !message_text.trim()) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ຄວາມ' });
  }

  const result = db.prepare(
    `INSERT INTO messages (customer_id, sender, message_text) VALUES (?, 'customer', ?)`
  ).run(customerId, message_text.trim());

  res.json({ success: true, messageId: result.lastInsertRowid });
});

// ລູກຄ້າ: ອັບໂຫລດຮູບແນບໃນແຊດ
router.post('/upload', requireCustomerAuth, upload.single('image'), async (req, res) => {
  const customerId = req.customerId;

  if (!req.file) {
    return res.status(400).json({ error: 'ກະລຸນາເລືອກຮູບພາບ' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer);

    const insert = db.prepare(
      `INSERT INTO messages (customer_id, sender, image_url) VALUES (?, 'customer', ?)`
    ).run(customerId, result.secure_url);

    res.json({ success: true, messageId: insert.lastInsertRowid, imageUrl: result.secure_url });
  } catch (err) {
    console.error('ອັບໂຫລດຮູບຜິດພາດ:', err.message);
    res.status(500).json({ error: 'ອັບໂຫລດຮູບບໍ່ສຳເລັດ' });
  }
});

// ================== ຝັ່ງແອດມິນ ==================

// ແອດມິນ: ລາຍຊື່ລູກຄ້າທັງໝົດ + ຂໍ້ຄວາມລ່າສຸດ + ຈຳນວນທີ່ຍັງບໍ່ອ່ານ
router.get('/list', requireAuth, (req, res) => {
  const customers = db.prepare(`
    SELECT
      c.id,
      c.phone,
      c.name,
      (SELECT message_text FROM messages WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*) FROM messages WHERE customer_id = c.id AND sender = 'customer' AND is_read = 0) AS unread_count
    FROM customers c
    WHERE EXISTS (SELECT 1 FROM messages WHERE customer_id = c.id)
    ORDER BY last_message_at DESC
  `).all();

  res.json({ customers });
});

// ແອດມິນ: ຂໍ້ຄວາມທັງໝົດຂອງລູກຄ້າຄົນໜຶ່ງ
router.get('/customer/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;

  const messages = db.prepare(
    'SELECT * FROM messages WHERE customer_id = ? ORDER BY created_at ASC'
  ).all(customerId);

  // ໝາຍວ່າອ່ານແລ້ວ (ສະເພາະຂໍ້ຄວາມຈາກລູກຄ້າ)
  db.prepare(
    "UPDATE messages SET is_read = 1 WHERE customer_id = ? AND sender = 'customer' AND is_read = 0"
  ).run(customerId);

  res.json({ messages });
});

// ແອດມິນ: ສົ່ງຂໍ້ຄວາມຫາລູກຄ້າຄົນໜຶ່ງ
router.post('/customer/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;
  const { message_text } = req.body;

  if (!message_text || !message_text.trim()) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ຄວາມ' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບລູກຄ້ານີ້' });
  }

  const result = db.prepare(
    `INSERT INTO messages (customer_id, sender, message_text) VALUES (?, 'admin', ?)`
  ).run(customerId, message_text.trim());

  res.json({ success: true, messageId: result.lastInsertRowid });
});

// ແອດມິນ: ອັບໂຫລດຮູບຕອບກັບລູກຄ້າ
router.post('/customer/:customerId/upload', requireAuth, upload.single('image'), async (req, res) => {
  const { customerId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'ກະລຸນາເລືອກຮູບພາບ' });
  }

  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'ບໍ່ພົບລູກຄ້ານີ້' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer);

    const insert = db.prepare(
      `INSERT INTO messages (customer_id, sender, image_url) VALUES (?, 'admin', ?)`
    ).run(customerId, result.secure_url);

    res.json({ success: true, messageId: insert.lastInsertRowid, imageUrl: result.secure_url });
  } catch (err) {
    console.error('ອັບໂຫລດຮູບຜິດພາດ:', err.message);
    res.status(500).json({ error: 'ອັບໂຫລດຮູບບໍ່ສຳເລັດ' });
  }
});

module.exports = router;