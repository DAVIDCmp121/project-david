const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = 'qr_' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

router.get('/payment-qr', async (req, res) => {
  const [rows] = await pool.query(`SELECT value FROM settings WHERE \`key\` = 'payment_qr'`);
  res.json({ qrImage: rows[0] ? rows[0].value : null });
});

router.post('/payment-qr', requireAuth, upload.single('qrImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ກະລນາເລືອກຮູບ QR' });
  }
  const imagePath = '/uploads/' + req.file.filename;

  await pool.query(`
    INSERT INTO settings (\`key\`, value) VALUES ('payment_qr', ?)
    ON DUPLICATE KEY UPDATE value = VALUES(value)
  `, [imagePath]);

  res.json({ success: true, qrImage: imagePath });
});

module.exports = router;