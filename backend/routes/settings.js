const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = 'qr_' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// ດຶງ QR ຮັບເງິນປັດຈຸບັນ (ລູກຄ້າ+ແອດມິນເອີ້ນໃຊ້ໄດ້ ບໍ່ຕ້ອງ login)
router.get('/payment-qr', (req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'payment_qr'`).get();
  res.json({ qrImage: row ? row.value : null });
});

// ອັບໂຫລດ/ປ່ຽນ QR ຮັບເງິນ (ແອດມິນເທົ່ານັ້ນ)
router.post('/payment-qr', requireAuth, upload.single('qrImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ກະລຸນາເລືອກຮູບ QR' });
  }
  const imagePath = '/uploads/' + req.file.filename;

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('payment_qr', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(imagePath);

  res.json({ success: true, qrImage: imagePath });
});

module.exports = router;