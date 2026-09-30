const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');

const MAX_MAIN = 8;
const SLOTS = ['main', 'side1', 'side2'];
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const name = 'banner_' + Date.now() + '_' + Math.round(Math.random() * 1e6) + path.extname(file.originalname);
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('not an image'));
  },
});

function uploadOne(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('BANNER UPLOAD ERROR:', err.code, err.message);
      return res.status(400).json({ error: 'ອບໂຫລດຮູບບໍສຳເລັດ' });
    }
    next();
  });
}

function removeFile(url) {
  try {
    if (url && url.startsWith('/uploads/')) {
      fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(url)));
    }
  } catch (e) {
    // ບເປັນຫຍັງ ຖ້າໄຟລບໍ່ມີແລ້ວ
  }
}

// ລູກຄາດູໄດ້ (ບໍ່ຕ້ອງ login) — ຖາສິນຄາທີ່ລິ້ງຖກລບແລ້ວ link_product_id ຈະເປັນ null
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.image_url, b.slot, p.id AS link_product_id
       FROM banners b
       LEFT JOIN products p ON p.id = b.link_product_id
       ORDER BY b.sort_order ASC, b.id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງແບນເນີບສຳເລັດ' });
  }
});

router.post('/', requireAuth, uploadOne, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ກະລນາເລືອກຮູບ' });
    }
    const imageUrl = '/uploads/' + req.file.filename;
    const slot = SLOTS.includes(req.body.slot) ? req.body.slot : 'main';

    if (slot === 'main') {
      const [[{ c }]] = await pool.query("SELECT COUNT(*) AS c FROM banners WHERE slot = 'main'");
      if (Number(c) >= MAX_MAIN) {
        removeFile(imageUrl);
        return res.status(400).json({ error: `ມີແບນເນຫຼັກໄດ້ສູງສດ ${MAX_MAIN} ຮູບ` });
      }
    }

    let linkId = parseInt(req.body.link_product_id, 10);
    if (!Number.isInteger(linkId)) linkId = null;

    let sortOrder = 0;
    if (slot === 'main') {
      const [[{ m }]] = await pool.query("SELECT COALESCE(MAX(sort_order), -1) AS m FROM banners WHERE slot = 'main'");
      sortOrder = Number(m) + 1;
    }

    const [result] = await pool.query(
      'INSERT INTO banners (image_url, link_product_id, sort_order, slot) VALUES (?, ?, ?, ?)',
      [imageUrl, linkId, sortOrder, slot]
    );

    // ຊ່ອງຂ້າງມໄດ້ 1 ຮູບ: ລບຮູບເກົ່າຂອງຊ່ອງນນອອກ
    if (slot !== 'main') {
      const [olds] = await pool.query(
        'SELECT id, image_url FROM banners WHERE slot = ? AND id <> ?',
        [slot, result.insertId]
      );
      for (const o of olds) {
        await pool.query('DELETE FROM banners WHERE id = ?', [o.id]);
        removeFile(o.image_url);
      }
    }

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ເພີມແບນເນບໍ່ສເລັດ' });
  }
});

// ຕ້ອງຢູ່ກ່ອນ router.put('/:id') ບໍ່ດງນັນ Express ຈະຈັບ 'reorder' ເປນ :id
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ຂໍ້ມູນລດັບບໍຖືກຕອງ' });
    }
    for (let i = 0; i < ids.length; i++) {
      await pool.query('UPDATE banners SET sort_order = ? WHERE id = ?', [i, ids[i]]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ບັນທຶກລຳດັບບໍ່ສເລັດ' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    let linkId = parseInt(req.body.link_product_id, 10);
    if (!Number.isInteger(linkId)) linkId = null;
    await pool.query('UPDATE banners SET link_product_id = ? WHERE id = ?', [linkId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ແກ້ໄຂບສຳເລັດ' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT image_url FROM banners WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    if (rows[0]) removeFile(rows[0].image_url);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ລຶບບໍ່ສເລັດ' });
  }
});

module.exports = router;