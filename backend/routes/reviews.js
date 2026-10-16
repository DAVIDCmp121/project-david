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
const MAX_PER_DAY = 5;          // ຣີວິວສິນຄ້າດຽວກັນໄດ້ສູງສຸດຕໍ່ວັນ (ກັນສະແປມ)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('ONLY_IMAGES'));
  },
});

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

function parseImages(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

// GET /api/reviews/product/:productId — ທຸກຄົນເບິ່ງໄດ້ (ບໍ່ຕ້ອງ login)
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const [rows] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.images, r.created_at, c.name, c.phone
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

// GET /api/reviews/can-review/:productId — ກວດວ່າລູກຄ້າທີ່ login ຣີວິວໄດ້ບໍ
router.get('/can-review/:productId', requireCustomerAuth, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const orderId = await findDeliveredOrder(req.customerId, productId);
    res.json({ success: true, canReview: !!orderId, orderId });
  } catch (err) {
    console.error('Error can-review:', err);
    res.status(500).json({ success: false, message: 'ກວດສິດບໍ່ສຳເລັດ' });
  }
});

// POST /api/reviews — ສົ່ງຣີວິວ (multipart/form-data)
// fields: productId, rating (1-5), comment, images (ສູງສຸດ 4 ຮູບ)
router.post(
  '/',
  requireCustomerAuth,
  (req, res, next) => {
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
  },
  async (req, res) => {
    try {
      const customerId = req.customerId;
      const productId = Number(req.body.productId);
      const rating = Number(req.body.rating);
      const comment = String(req.body.comment || '').trim().slice(0, 1000);
      const files = req.files || [];

      if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'ຂໍ້ມູນບໍ່ຖືກຕ້ອງ (ຄະແນນ 1-5)' });
      }

      const orderId = await findDeliveredOrder(customerId, productId);
      if (!orderId) {
        return res.status(403).json({
          success: false,
          message: 'ຣີວິວໄດ້ສະເພາະສິນຄ້າທີ່ຊື້ ແລະ ໄດ້ຮັບແລ້ວເທົ່ານັ້ນ',
        });
      }

      // ກັນສະແປມ: ສິນຄ້າດຽວກັນ ຣີວິວໄດ້ບໍ່ເກີນ MAX_PER_DAY ຄັ້ງໃນ 24 ຊົ່ວໂມງ
      const [recent] = await pool.query(
        `SELECT COUNT(*) AS c FROM product_reviews
         WHERE customer_id = ? AND product_id = ? AND created_at >= (NOW() - INTERVAL 1 DAY)`,
        [customerId, productId]
      );
      if (Number(recent[0].c) >= MAX_PER_DAY) {
        return res.status(429).json({
          success: false,
          message: 'ຣີວິວສິນຄ້ານີ້ຫຼາຍເກີນໄປແລ້ວໃນມື້ນີ້ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ',
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
  }
);

module.exports = router;