const express = require('express');
const multer = require('multer');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// ໂຫຼດ config ເພື່ອໃຫ້ cloudinary ຖືກຕັ້ງຄ່າ (ໃຊ້ຕົວດຽວກັນກັບຮູບແຊັດ)
require('../config/cloudinary');
const { v2: cloudinary } = require('cloudinary');

// ສະຖານະອໍເດີທີ່ຖືວ່າ "ໄດ້ຮັບຂອງແລ້ວ"
const DELIVERED_STATUSES = ['delivered'];

const MAX_IMAGES = 4;           // ແນບຮູບໄດ້ສູງສຸດຕໍ່ຣີວິວ
const MAX_FILE_MB = 5;          // ຂະໜາດຮູບສູງສຸດ (ໜ້າເວັບຍ່ອຮູບໃຫ້ແລ້ວ)
const MAX_EDITS = 1;            // ແກ້ໄຂຣີວິວຂອງຕົນເອງໄດ້ກີ່ຄັ້ງ

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('ONLY_IMAGES'));
  },
});

// middleware ຮັບຮູບ (ໃຊ້ທັງຕອນສົ່ງຣີວິວ ແລະ ຕອນແກ້ໄຂ)
function uploadImages(req, res, next) {
  upload.array('images', MAX_IMAGES)(req, res, (err) => {
    if (err) {
      const msg =
        err.message === 'ONLY_IMAGES'
          ? 'ອັບໂຫຼດໄດ້ສະເພາະໄຟລ໌ຮູບ'
          : `ຮູບໃຫຍ່ເກີນ ${MAX_FILE_MB}MB ຫຼື ເກີນ ${MAX_IMAGES} ຮູບ`;
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
}

// ຊື່ລູກຄ້າທີ່ສະແດງໃນຣີວິວ: ເຊື່ອງບາງສ່ວນເພື່ອຄວາມເປັນສ່ວນຕົວ
function maskName(name, phone) {
  if (name && name.trim()) {
    const chars = Array.from(name.trim());
    return chars[0] + '***';
  }
  const p = String(phone || '');
  return p ? '***' + p.slice(-3) : 'ລູກຄ້າ';
}

// ຫາອໍເດີທີ່ລູກຄ້າຊື້ສິນຄ້ານີ້ ແລະ ໄດ້ຮັບຂອງແລ້ວ (ເອົາອັນຫຼ້າສຸດ)
async function findDeliveredOrder(customerId, productId) {
  const [rows] = await pool.query(
    `SELECT o.id FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id = ? AND oi.product_id = ? AND o.order_status IN (?)
     ORDER BY o.created_at DESC LIMIT 1`,
    [customerId, productId, DELIVERED_STATUSES]
  );
  return rows.length ? rows[0].id : null;
}

// ອັບໂຫຼດຮູບ 1 ໄຟລ໌ຂຶ້ນ Cloudinary ແລ້ວສົ່ງ URL ກັບມາ
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'polo-shop/reviews', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

// ຮູບທີ່ຖືກແທນທີ່/ລຶບ → ລຶບອອກຈາກ Cloudinary (ພະຍາຍາມລຶບ ຖ້າບໍ່ໄດ້ກໍຂ້າມໄປ)
function publicIdFromUrl(url) {
  const m = String(url || '').match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return m ? m[1] : null;
}
async function destroyImages(urls) {
  for (const u of urls) {
    if (!String(u).includes('/polo-shop/reviews/')) continue;
    const id = publicIdFromUrl(u);
    if (!id) continue;
    try {
      await cloudinary.uploader.destroy(id);
    } catch (e) {
      console.warn('ລຶບຮູບຣີວິວຈາກ Cloudinary ບໍ່ໄດ້:', e.message);
    }
  }
}

function parseImages(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

// GET /api/reviews/summary — ຄະແນນສະເລ່ຍ + ຈຳນວນຣີວິວ ຂອງທຸກສິນຄ້າ (ໜ້າລາຍການສິນຄ້າໃຊ້ສະແດງດາວ)
// ຕອບເປັນ { summary: { "<product_id>": { average, count } } }
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT product_id, ROUND(AVG(rating), 1) AS average, COUNT(*) AS count
       FROM product_reviews GROUP BY product_id`
    );
    const summary = {};
    rows.forEach((r) => {
      summary[r.product_id] = { average: Number(r.average), count: Number(r.count) };
    });
    res.json({ success: true, summary });
  } catch (err) {
    console.error('Error review summary:', err);
    res.status(500).json({ success: false, message: 'ດຶງຄະແນນບໍ່ສຳເລັດ' });
  }
});

// GET /api/reviews/product/:productId — ທຸກຄົນເບິ່ງໄດ້ (ບໍ່ຕ້ອງ login)
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.images, r.created_at, r.edit_count, c.name, c.phone
       FROM product_reviews r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [productId]
    );
    const reviews = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment || '',
      images: parseImages(r.images),
      created_at: r.created_at,
      edited: Number(r.edit_count) > 0,
      display_name: maskName(r.name, r.phone),
    }));
    const count = reviews.length;
    const average = count
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
    res.json({ success: true, average, count, reviews });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ success: false, message: 'ດຶງຣີວິວບໍ່ສຳເລັດ' });
  }
});

// GET /api/reviews/can-review/:productId — ສະຖານະຂອງລູກຄ້າທີ່ login ກັບສິນຄ້ານີ້
// - ຍັງບໍ່ເຄີຍຣີວິວ + ເຄີຍຊື້ແລະໄດ້ຮັບແລ້ວ → canReview = true
// - ຣີວິວແລ້ວ → myReview = ຣີວິວຂອງຕົນ, canEdit = ຍັງແກ້ໄດ້ບໍ
router.get('/can-review/:productId', requireCustomerAuth, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const customerId = req.customerId;

    const [mine] = await pool.query(
      `SELECT id, rating, comment, images, edit_count FROM product_reviews
       WHERE customer_id = ? AND product_id = ? ORDER BY id DESC LIMIT 1`,
      [customerId, productId]
    );
    if (mine.length > 0) {
      const m = mine[0];
      return res.json({
        success: true,
        canReview: false,
        myReview: {
          id: m.id,
          rating: m.rating,
          comment: m.comment || '',
          images: parseImages(m.images),
        },
        canEdit: Number(m.edit_count) < MAX_EDITS,
      });
    }

    const orderId = await findDeliveredOrder(customerId, productId);
    res.json({ success: true, canReview: !!orderId, myReview: null, canEdit: false });
  } catch (err) {
    console.error('Error can-review:', err);
    res.status(500).json({ success: false, message: 'ກວດສິດບໍ່ສຳເລັດ' });
  }
});

// POST /api/reviews — ສົ່ງຣີວິວ (multipart/form-data) — 1 ລູກຄ້າ ຣີວິວ 1 ສິນຄ້າ ໄດ້ 1 ຄັ້ງ
// fields: productId, rating (1-5), comment, images (ສູງສຸດ 4 ຮູບ)
router.post('/', requireCustomerAuth, uploadImages, async (req, res) => {
  try {
    const customerId = req.customerId;
    const productId = Number(req.body.productId);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim().slice(0, 1000);
    const files = req.files || [];

    if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ (ຄະແນນ 1-5)' });
    }

    // ຣີວິວສິນຄ້ານີ້ແລ້ວ → ໃຫ້ໄປແກ້ໄຂແທນ
    const [exist] = await pool.query(
      'SELECT id FROM product_reviews WHERE customer_id = ? AND product_id = ? LIMIT 1',
      [customerId, productId]
    );
    if (exist.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'ເຈົ້າຣີວິວສິນຄ້ານີ້ແລ້ວ (ແກ້ໄຂໄດ້ຈາກຣີວິວຂອງເຈົ້າ)',
      });
    }

    const orderId = await findDeliveredOrder(customerId, productId);
    if (!orderId) {
      return res.status(403).json({
        success: false,
        message: 'ຣີວິວໄດ້ສະເພາະສິນຄ້າທີ່ຊື້ ແລະ ໄດ້ຮັບແລ້ວເທົ່ານັ້ນ',
      });
    }

    // ອັບໂຫຼດຮູບ (ຖ້າມີ)
    let imageUrls = [];
    if (files.length > 0) {
      try {
        imageUrls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
      } catch (e) {
        console.error('Cloudinary upload failed:', e);
        return res.status(500).json({ success: false, message: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
      }
    }

    await pool.query(
      `INSERT INTO product_reviews (product_id, customer_id, order_id, rating, comment, images)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        productId,
        customerId,
        orderId,
        rating,
        comment || null,
        imageUrls.length ? JSON.stringify(imageUrls) : null,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ success: false, message: 'ສົ່ງຣີວິວບໍ່ສຳເລັດ' });
  }
});

// PUT /api/reviews/:id — ແກ້ໄຂຣີວິວຂອງຕົນເອງ (ໄດ້ MAX_EDITS ຄັ້ງ)
// fields: rating, comment, keepImages (JSON ຂອງ URL ຮູບເກົ່າທີ່ຈະເກັບໄວ້), images (ຮູບໃໝ່)
router.put('/:id', requireCustomerAuth, uploadImages, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim().slice(0, 1000);
    const files = req.files || [];

    if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ (ຄະແນນ 1-5)' });
    }

    const [rows] = await pool.query(
      'SELECT id, images, edit_count FROM product_reviews WHERE id = ? AND customer_id = ?',
      [id, req.customerId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ບໍ່ພົບຣີວິວນີ້' });
    }
    const review = rows[0];
    if (Number(review.edit_count) >= MAX_EDITS) {
      return res.status(403).json({
        success: false,
        message: `ແກ້ໄຂຣີວິວໄດ້ ${MAX_EDITS} ຄັ້ງເທົ່ານັ້ນ ເຈົ້າແກ້ໄຂຄົບແລ້ວ`,
      });
    }

    // ຮູບເກົ່າທີ່ເກັບໄວ້: ຕ້ອງເປັນຮູບທີ່ມີຢູ່ໃນຣີວິວນີ້ເທົ່ານັ້ນ
    const oldImages = parseImages(review.images);
    let keep = [];
    try {
      keep = JSON.parse(req.body.keepImages || '[]');
    } catch (e) {
      keep = [];
    }
    keep = Array.isArray(keep) ? keep.filter((u) => oldImages.includes(u)) : [];

    if (keep.length + files.length > MAX_IMAGES) {
      return res.status(400).json({ success: false, message: `ແນບຮູບໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ` });
    }

    let newUrls = [];
    if (files.length > 0) {
      try {
        newUrls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));
      } catch (e) {
        console.error('Cloudinary upload failed:', e);
        return res.status(500).json({ success: false, message: 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ' });
      }
    }
    const finalImages = [...keep, ...newUrls];

    // ເງື່ອນໄຂ edit_count < MAX_EDITS ໃນ SQL ເອງ ກັນກົດແກ້ໄຂພ້ອມກັນຫຼາຍຄັ້ງ
    const [upd] = await pool.query(
      `UPDATE product_reviews
       SET rating = ?, comment = ?, images = ?, edit_count = edit_count + 1, updated_at = NOW()
       WHERE id = ? AND customer_id = ? AND edit_count < ?`,
      [rating, comment || null, finalImages.length ? JSON.stringify(finalImages) : null, id, req.customerId, MAX_EDITS]
    );
    if (upd.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'ແກ້ໄຂຣີວິວໄດ້ຄົບຈຳນວນແລ້ວ' });
    }

    // ຮູບເກົ່າທີ່ຖືກເອົາອອກ → ລຶບຈາກ Cloudinary
    await destroyImages(oldImages.filter((u) => !keep.includes(u)));

    res.json({ success: true });
  } catch (err) {
    console.error('Error editing review:', err);
    res.status(500).json({ success: false, message: 'ແກ້ໄຂຣີວິວບໍ່ສຳເລັດ' });
  }
});

module.exports = router;