// Route ຈດການຂຄວາມແຊດ ລະຫວາງລກຄ້າ ແລະ ແອດມິນ
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../db');
const cloudinary = require('../config/cloudinary');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const requireAuth = require('../middleware/requireAuth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('ອະນຍາດສະເພາະໄຟລຮູບພາບເທານນ'));
    }
    cb(null, true);
  }
});

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

// ================== ຝັງລກຄ້າ ==================

router.get('/', requireCustomerAuth, async (req, res) => {
  const customerId = req.customerId;

  const [messages] = await pool.query(
    'SELECT * FROM messages WHERE customer_id = ? ORDER BY created_at ASC',
    [customerId]
  );

  await pool.query(
    "UPDATE messages SET is_read = 1 WHERE customer_id = ? AND sender = 'admin' AND is_read = 0",
    [customerId]
  );

  res.json({ messages });
});

router.post('/', requireCustomerAuth, async (req, res) => {
  const customerId = req.customerId;
  const { message_text } = req.body;

  if (!message_text || !message_text.trim()) {
    return res.status(400).json({ error: 'ກະລນາປອນຂຄວາມ' });
  }

  const [result] = await pool.query(
    `INSERT INTO messages (customer_id, sender, message_text) VALUES (?, 'customer', ?)`,
    [customerId, message_text.trim()]
  );

  res.json({ success: true, messageId: result.insertId });
});

router.post('/upload', requireCustomerAuth, upload.single('image'), async (req, res) => {
  const customerId = req.customerId;

  if (!req.file) {
    return res.status(400).json({ error: 'ກະລຸນາເລອກຮູບພາບ' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer);

    const [insert] = await pool.query(
      `INSERT INTO messages (customer_id, sender, image_url) VALUES (?, 'customer', ?)`,
      [customerId, result.secure_url]
    );

    res.json({ success: true, messageId: insert.insertId, imageUrl: result.secure_url });
  } catch (err) {
    console.error('ອບໂຫລດຮູບຜິດພາດ:', err.message);
    res.status(500).json({ error: 'ອັບໂຫລດຮູບບສເລັດ' });
  }
});

// ================== ຝງແອດມິນ ==================

router.get('/list', requireAuth, async (req, res) => {
  const [customers] = await pool.query(`
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
  `);

  res.json({ customers });
});

router.get('/customer/:customerId', requireAuth, async (req, res) => {
  const { customerId } = req.params;

  const [messages] = await pool.query(
    'SELECT * FROM messages WHERE customer_id = ? ORDER BY created_at ASC',
    [customerId]
  );

  await pool.query(
    "UPDATE messages SET is_read = 1 WHERE customer_id = ? AND sender = 'customer' AND is_read = 0",
    [customerId]
  );

  res.json({ messages });
});

router.post('/customer/:customerId', requireAuth, async (req, res) => {
  const { customerId } = req.params;
  const { message_text } = req.body;

  if (!message_text || !message_text.trim()) {
    return res.status(400).json({ error: 'ກະລນາປອນຂຄວາມ' });
  }

  const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'ບພບລູກຄ້ານ' });
  }

  const [result] = await pool.query(
    `INSERT INTO messages (customer_id, sender, message_text) VALUES (?, 'admin', ?)`,
    [customerId, message_text.trim()]
  );

  res.json({ success: true, messageId: result.insertId });
});

router.post('/customer/:customerId/upload', requireAuth, upload.single('image'), async (req, res) => {
  const { customerId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'ກະລນາເລືອກຮູບພາບ' });
  }

  const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [customerId]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'ບພບລກຄ້ານ' });
  }

  try {
    const result = await uploadToCloudinary(req.file.buffer);

    const [insert] = await pool.query(
      `INSERT INTO messages (customer_id, sender, image_url) VALUES (?, 'admin', ?)`,
      [customerId, result.secure_url]
    );

    res.json({ success: true, messageId: insert.insertId, imageUrl: result.secure_url });
  } catch (err) {
    console.error('ອບໂຫລດຮູບຜິດພາດ:', err.message);
    res.status(500).json({ error: 'ອບໂຫລດຮບບສເລດ' });
  }
});

module.exports = router;