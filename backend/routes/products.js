const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const requireAuth = require('../middleware/requireAuth');

const MAX_IMAGES = 6;

// ตงค่า multer ให้เก็บไฟล์ที่ public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '_' + Math.round(Math.random() * 1e6) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('not an image'));
  },
});

function uploadImages(req, res, next) {
  upload.array('images', MAX_IMAGES)(req, res, (err) => {
    if (err) {
      console.error('UPLOAD ERROR:', err.code, err.message);
      return res.status(400).json({ error: `ອບໂຫລດຮູບບສຳເລັດ (${err.code || err.message})` });
    }
    next();
  });
}

function parseSizeChart(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function cleanSizeChart(raw) {
  if (raw === undefined) return undefined;
  let arr = [];
  try { arr = JSON.parse(raw); } catch (e) { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  const rows = arr
    .map((r) => ({
      size: String((r && r.size) || '').trim().slice(0, 30),
      chest: String((r && r.chest) || '').trim().slice(0, 30),
      length: String((r && r.length) || '').trim().slice(0, 30),
    }))
    .filter((r) => r.size);
  return JSON.stringify(rows);
}

// ✅ ໃໝ່: ລາງຊື່ໝວດ — ບໄດ້ສົງມາ = undefined, ສງມາເປນຄາຫວາງ = null (ບໍ່ມໝວດ)
function cleanCategory(raw) {
  if (raw === undefined) return undefined;
  const v = String(raw).trim().slice(0, 100);
  return v === '' ? null : v;
}

function buildImageList(req) {
  const files = req.files || [];
  if (req.body.image_order === undefined) {
    return files.map((f) => '/uploads/' + f.filename);
  }
  let order = [];
  try { order = JSON.parse(req.body.image_order); } catch (e) { order = []; }
  if (!Array.isArray(order)) order = [];

  const result = [];
  let fileIndex = 0;
  for (const entry of order) {
    if (entry === '__new__') {
      if (files[fileIndex]) {
        result.push('/uploads/' + files[fileIndex].filename);
        fileIndex++;
      }
    } else if (typeof entry === 'string' && entry.startsWith('/uploads/')) {
      result.push(entry);
    }
  }
  return result;
}

async function saveImages(productId, images) {
  await pool.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
  for (let i = 0; i < images.length; i++) {
    await pool.query(
      'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
      [productId, images[i], i]
    );
  }
  await pool.query('UPDATE products SET image = ? WHERE id = ?', [images[0] || '', productId]);
}

// ດຶງສນຄ້າທງໝົດ (ທຸກຄົນດູໄດ້ ບຕ້ອງ login) — ຮຽງຕາມ sort_order
router.get('/', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products ORDER BY sort_order ASC, id ASC');
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງຂມູນສນຄ້າບສຳເລັດ' });
  }
});

// ບັນທຶກລຳດບການສະແດງສິນຄາ (ລາກສະຫຼັບໃນໜາແອັດມິນ)
// ຕອງຢູກ່ອນ router.put('/:id', ...) ບໍດັງນນ Express ຈະຈັບ 'reorder' ເປັນ :id
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ຂໍ້ມນລດບບຖືກຕອງ' });
    }
    for (let i = 0; i < ids.length; i++) {
      await pool.query('UPDATE products SET sort_order = ? WHERE id = ?', [i, ids[i]]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ບັນທຶກລຳດັບບສເລັດ' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const product = rows[0];
    if (!product) {
      return res.status(404).json({ error: 'ບໍພົບສິນຄ້ານີ້' });
    }

    const [imgRows] = await pool.query(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [product.id]
    );
    let images = imgRows.map((r) => r.image_url);
    if (images.length === 0 && product.image) images = [product.image];

    res.json({ ...product, images, size_chart: parseSizeChart(product.size_chart) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງຂໍ້ມູນສິນຄາບໍ່ສເລັດ' });
  }
});

router.post('/', requireAuth, uploadImages, async (req, res) => {
  try {
    const { name, price, size, color, stock, description } = req.body;
    if (!name || price === undefined || price === '') {
      return res.status(400).json({ error: 'ກະລນາໃສຊື່ສິນຄ້າ ແລະ ລາຄາ' });
    }

    const images = buildImageList(req);
    if (images.length > MAX_IMAGES) {
      return res.status(400).json({ error: `ອັບໂຫລດໄດ້ສູງສດ ${MAX_IMAGES} ຮູບ` });
    }
    const sizeChart = cleanSizeChart(req.body.size_chart) || '[]';
    const category = cleanCategory(req.body.category);

    const [result] = await pool.query(
      `INSERT INTO products (name, price, size, color, stock, image, description, size_chart, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, price, size || '', color || '', stock || 0, images[0] || '', description || '', sizeChart, category ?? null]
    );
    await saveImages(result.insertId, images);

    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ເພີມສິນຄ້າບໍ່ສເລັດ' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const productId = req.params.id;

    await pool.query('DELETE FROM orders WHERE product_id = ?', [productId]);
    await pool.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
    await pool.query('DELETE FROM products WHERE id = ?', [productId]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ລຶບສິນຄ້າບໍສຳເລັດ' });
  }
});

router.put('/:id', requireAuth, uploadImages, async (req, res) => {
  try {
    const { name, price, size, color, stock, description } = req.body;
    const productId = req.params.id;

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (size !== undefined) { fields.push('size = ?'); values.push(size); }
    if (color !== undefined) { fields.push('color = ?'); values.push(color); }
    if (stock !== undefined) { fields.push('stock = ?'); values.push(stock); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }

    const category = cleanCategory(req.body.category);
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }

    const sizeChart = cleanSizeChart(req.body.size_chart);
    if (sizeChart !== undefined) { fields.push('size_chart = ?'); values.push(sizeChart); }

    let images = null;
    if (req.body.image_order !== undefined || (req.files && req.files.length > 0)) {
      images = buildImageList(req);
      if (images.length > MAX_IMAGES) {
        return res.status(400).json({ error: `ອັບໂຫລດໄດສູງສດ ${MAX_IMAGES} ຮູບ` });
      }
    }

    if (fields.length === 0 && images === null) {
      return res.status(400).json({ error: 'ບໍ່ມຂໍ້ມູນທີ່ຈະອັບເດດ' });
    }

    if (fields.length > 0) {
      values.push(productId);
      await pool.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    if (images !== null) {
      await saveImages(productId, images);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ອັບເດດສິນຄ້າບໍສເລັດ' });
  }
});

module.exports = router;