const express = require('express');
const router = express.Router();
console.log('✅ settings.js (shipping) โหลดแล้ว จาก', __filename);
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requireAuth = require('../middleware/requireAuth');
const { getShippingConfig, parseShippingInput, saveShippingConfig } = require('../utils/shipping');

const MAX_BANKS = 6;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    // ສົ່ງຫຼາຍໄຟລ໌ພ້ອມກັນ (QR + ໂລໂກ້) ຈຶ່ງຕ້ອງມີຕົວສຸ່ມ ກັນຊື່ຊ້ຳ
    const prefix = file.fieldname === 'logo' ? 'banklogo_' : 'qr_';
    const rand = Math.random().toString(36).slice(2, 6);
    cb(null, prefix + Date.now() + '_' + rand + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  // ຮັບສະເພາະໄຟລ໌ຮູບ
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype || '')),
});

function removeUploaded(file) {
  if (!file) return;
  try {
    fs.unlinkSync(path.join(__dirname, '../public/uploads', file.filename));
  } catch (e) {
    // ບໍ່ມີໄຟລ໌ກໍ່ຂ້າມໄປ
  }
}

function removeUploadedByUrl(url) {
  if (!url) return;
  try {
    fs.unlinkSync(path.join(__dirname, '../public/uploads', path.basename(url)));
  } catch (e) {
    // ບໍ່ມີໄຟລ໌ກໍ່ຂ້າມໄປ
  }
}

// ---------- QR ເກົ່າ (ຮູບດຽວ) — ຍັງເກັບໄວ້ເປັນສຳຮອງ ----------
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

// ---------- QR ຫຼາຍທະນາຄານ (ເກັບເປັນ JSON ໃນ settings.payment_banks) ----------
// ແຕ່ລະອັນ: { id, name, image, logo, payload }
// payload = ຂໍ້ຄວາມທີ່ອ່ານໄດ້ຈາກ QR (ໃຊ້ສ້າງ QR ຝັງຍອດ), logo = ໂລໂກ້ທະນາຄານ (ບໍ່ບັງຄັບ)
async function readBanks() {
  const [rows] = await pool.query(`SELECT value FROM settings WHERE \`key\` = 'payment_banks'`);
  if (!rows[0] || !rows[0].value) return [];
  try {
    const arr = JSON.parse(rows[0].value);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

async function writeBanks(banks) {
  await pool.query(
    `INSERT INTO settings (\`key\`, value) VALUES ('payment_banks', ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [JSON.stringify(banks)]
  );
}

// ລາຍຊື່ທະນາຄານ (ທຸກຄົນເບິ່ງໄດ້ — ໜ້າຊຳລະເງິນໃຊ້)
router.get('/payment-banks', async (req, res) => {
  try {
    res.json({ banks: await readBanks() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫຼດລາຍຊື່ທະນາຄານບໍ່ສຳເລັດ' });
  }
});

// ຮັບ 2 ໄຟລ໌: qrImage + logo (ເພີ່ມ: QR ບັງຄັບ / ແກ້ໄຂ: ບໍ່ບັງຄັບທັງຄູ່)
const bankUpload = upload.fields([
  { name: 'qrImage', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
]);

function pickFiles(req) {
  return {
    qrFile: req.files && req.files.qrImage ? req.files.qrImage[0] : null,
    logoFile: req.files && req.files.logo ? req.files.logo[0] : null,
  };
}

function cleanPayload(raw) {
  const p = String(raw || '').trim().slice(0, 1000);
  return p.startsWith('000201') ? p : '';
}

// ເພີ່ມທະນາຄານ (ແອດມິນ)
router.post('/payment-banks', requireAuth, bankUpload, async (req, res) => {
  const { qrFile, logoFile } = pickFiles(req);
  function cleanup() {
    removeUploaded(qrFile);
    removeUploaded(logoFile);
  }

  try {
    const name = String(req.body.name || '').trim().slice(0, 40);
    const payload = cleanPayload(req.body.payload);

    if (!qrFile) {
      cleanup();
      return res.status(400).json({ error: 'ກະລຸນາເລືອກຮູບ QR' });
    }
    if (!name) {
      cleanup();
      return res.status(400).json({ error: 'ກະລຸນາໃສ່ຊື່ທະນາຄານ' });
    }

    const banks = await readBanks();
    if (banks.length >= MAX_BANKS) {
      cleanup();
      return res.status(400).json({ error: `ເພີ່ມໄດ້ສູງສຸດ ${MAX_BANKS} ທະນາຄານ` });
    }

    const bank = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      image: '/uploads/' + qrFile.filename,
      logo: logoFile ? '/uploads/' + logoFile.filename : '',
      payload,
    };
    banks.push(bank);
    await writeBanks(banks);
    res.json({ success: true, bank });
  } catch (err) {
    console.error(err);
    cleanup();
    res.status(500).json({ error: 'ບັນທຶກທະນາຄານບໍ່ສຳເລັດ' });
  }
});

// ແກ້ໄຂທະນາຄານ (ແອດມິນ) — ປ່ຽນຊື່ / QR ໃໝ່ / ໂລໂກ້ໃໝ່ / ເອົາໂລໂກ້ອອກ (removeLogo=1)
router.put('/payment-banks/:id', requireAuth, bankUpload, async (req, res) => {
  const { qrFile, logoFile } = pickFiles(req);
  function cleanup() {
    removeUploaded(qrFile);
    removeUploaded(logoFile);
  }

  try {
    const banks = await readBanks();
    const idx = banks.findIndex((b) => b.id === req.params.id);
    if (idx < 0) {
      cleanup();
      return res.status(404).json({ error: 'ບໍ່ພົບທະນາຄານນີ້' });
    }

    const name = String(req.body.name || '').trim().slice(0, 40);
    if (!name) {
      cleanup();
      return res.status(400).json({ error: 'ກະລຸນາໃສ່ຊື່ທະນາຄານ' });
    }

    const bank = { ...banks[idx] };
    const oldImage = bank.image;
    const oldLogo = bank.logo;
    bank.name = name;

    // QR ໃໝ່ → ປ່ຽນຮູບ ແລະ ຂໍ້ມູນທີ່ອ່ານໄດ້ (ຖ້າບໍ່ໄດ້ສົ່ງ QR ມາ ຈະໃຊ້ຂອງເດີມ)
    if (qrFile) {
      bank.image = '/uploads/' + qrFile.filename;
      bank.payload = cleanPayload(req.body.payload);
    }

    // ໂລໂກ້: ມີໄຟລ໌ໃໝ່ = ປ່ຽນ, removeLogo=1 = ເອົາອອກ, ບໍ່ສົ່ງ = ຄົງເດີມ
    if (logoFile) {
      bank.logo = '/uploads/' + logoFile.filename;
    } else if (String(req.body.removeLogo) === '1') {
      bank.logo = '';
    }

    banks[idx] = bank;
    await writeBanks(banks);

    // ບັນທຶກສຳເລັດແລ້ວ ຈຶ່ງລຶບໄຟລ໌ເກົ່າທີ່ຖືກແທນທີ່
    if (bank.image !== oldImage) removeUploadedByUrl(oldImage);
    if (bank.logo !== oldLogo) removeUploadedByUrl(oldLogo);

    res.json({ success: true, bank });
  } catch (err) {
    console.error(err);
    cleanup();
    res.status(500).json({ error: 'ແກ້ໄຂທະນາຄານບໍ່ສຳເລັດ' });
  }
});

// ລຶບທະນາຄານ (ແອດມິນ)
router.delete('/payment-banks/:id', requireAuth, async (req, res) => {
  try {
    const banks = await readBanks();
    const target = banks.find((b) => b.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'ບໍ່ພົບທະນາຄານນີ້' });
    }
    await writeBanks(banks.filter((b) => b.id !== req.params.id));
    removeUploadedByUrl(target.image);
    removeUploadedByUrl(target.logo);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ລຶບທະນາຄານບໍ່ສຳເລັດ' });
  }
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