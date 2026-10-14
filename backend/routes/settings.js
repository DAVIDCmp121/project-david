const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const { getShippingConfig, parseShippingInput, saveShippingConfig } = require('../utils/shipping');

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
    return res.status(400).json({ error: 'ກະລຸນາເລືອກຮູບ QR' });
  }
  const imagePath = '/uploads/' + req.file.filename;

  await pool.query(`
    INSERT INTO settings (\`key\`, value) VALUES ('payment_qr', ?)
    ON DUPLICATE KEY UPDATE value = VALUES(value)
  `, [imagePath]);

  res.json({ success: true, qrImage: imagePath });
});

// ຄ່າສົ່ງ (ສະເພາະແອດມິນ/ພະນັກງານທີ່ລັອກອິນ)
router.get('/shipping', requireAuth, async (req, res) => {
  try {
    res.json(await getShippingConfig(pool));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫຼດຄ່າສົ່ງບໍ່ສຳເລັດ' });
  }
});

router.put('/shipping', requireAuth, async (req, res) => {
  try {
    const cfg = parseShippingInput(req.body);
    if (!cfg) {
      return res.status(400).json({ error: 'ຕົວເລກບໍ່ຖືກຕ້ອງ ກະລຸນາໃສ່ຈຳນວນເຕັມ 0 ຂຶ້ນໄປ' });
    }
    await saveShippingConfig(pool, cfg);
    res.json({ success: true, ...cfg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ບັນທຶກຄ່າສົ່ງບໍ່ສຳເລັດ' });
  }
});

module.exports = router;