const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const requireAuth = require('../middleware/requireAuth');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const sharp = require('sharp');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = 'slip_' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });

const SLIP_KEYWORDS = [
  'ໂອນ', 'ສຳເລັດ', 'LAPNET', 'LAO QR', 'BCEL', 'ATM',
  'TRANSFER', 'AMOUNT', 'ກີບ', 'KIP', 'SUCCESS', 'LAK'
];

const VALID_STATUSES = ['awaiting_review', 'confirmed', 'shipped', 'delivered'];

function extractAmounts(text) {
  const matches = text.match(/\d[\d,.\s]{2,}\d/g) || [];
  return matches
    .map(m => {
      const withoutDecimal = m.replace(/\.\d{1,2}$/, '');
      return parseInt(withoutDecimal.replace(/[,\s]/g, ''), 10);
    })
    .filter(n => !isNaN(n) && n >= 1000);
}

function extractDates(text) {
  const matches = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || [];
  return matches;
}

function isSameDate(dateStr, now) {
  const parts = dateStr.split(/[\/\-]/).map(p => parseInt(p, 10));
  if (parts.length !== 3) return false;
  let [d, m, y] = parts;
  if (y < 100) y += 2000;
  return d === now.getDate() && m === (now.getMonth() + 1) && y === now.getFullYear();
}

function extractBillNumber(text) {
  const labeled = text.match(/\b(?:REF|REFERENCE|TRANS(?:ACTION)?|TXN|ID)\b[\s:.\-]*([A-Z0-9]{6,25})/);
  if (labeled) return labeled[1];

  const digitRuns = text.match(/\d{8,20}/g);
  if (digitRuns && digitRuns.length > 0) {
    return digitRuns.reduce((a, b) => (b.length > a.length ? b : a));
  }

  return null;
}

async function checkSlip(buffer, expectedAmount) {
  try {
    const processedBuffer = await sharp(buffer)
      .grayscale()
      .normalize()
      .resize({ width: 1200, withoutEnlargement: false })
      .toBuffer();
    const { data } = await Tesseract.recognize(processedBuffer, 'lao+eng');
    const text = (data.text || '').toUpperCase();

    if (text.trim().length < 5) {
      return { valid: false, reason: 'ອ່ານຂໍ້ມູນຈາກຮູບບໍ່ໄດ້ ກະລຸນາອັບໂຫລດຮູບທີ່ຊັດເຈນກວ່ານີ້' };
    }

    const hasKeyword = SLIP_KEYWORDS.some(k => text.includes(k));
    if (!hasKeyword) {
      return { valid: false, reason: 'ຮູບທີ່ອັບໂຫລດບໍ່ແມ່ນສະລິບໂອນເງິນ' };
    }

    const amounts = extractAmounts(text);
    const amountMatch = amounts.some(a => Math.abs(a - expectedAmount) <= 1);
    if (!amountMatch) {
      return {
        valid: false,
        reason: `ຍອດເງິນໃນສະລິບບໍ່ຕົງກັບຍອດທີ່ຕ້ອງຈ່າຍ (${expectedAmount} ກີບ) ກະລຸນາກວດສອບ`
      };
    }

    const dates = extractDates(text);
    if (dates.length > 0) {
      const now = new Date();
      const dateOk = dates.some(d => isSameDate(d, now));
      if (!dateOk) {
        return { valid: false, reason: 'ວັນທີ່ໃນສະລິບບໍ່ແມ່ນມື້ນີ້ ກະລຸນາໂອນເງິນແລ້ວອັບໂຫລດສະລິບໃໝ່' };
      }
    }

    const billNumber = extractBillNumber(text);
    return { valid: true, billNumber };
  } catch (err) {
    console.error('OCR error:', err);
    return { valid: false, reason: 'ກວດສອບຮູບບໍ່ໄດ້ ກະລຸນາລອງໃໝ່' };
  }
}

// ດຶງລາຍການອໍເດີທັງໝົດ (ແອັດມິນ/ພະນັກງານ)
router.get('/', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT orders.*, products.name AS product_name, products.price
      FROM orders
      JOIN products ON orders.product_id = products.id
      ORDER BY orders.created_at DESC
    `);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງຂໍ້ມູນອໍເດີບໍ່ສຳເລັດ' });
  }
});

router.post('/verify-slip', uploadMemory.single('slip'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ valid: false, reason: 'ບໍ່ພົບຮູບ' });
    }

    const { product_id, quantity } = req.body;
    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ valid: false, reason: 'ບໍ່ພົບສິນຄ້ານີ້' });
    }

    const expectedAmount = product.price * parseInt(quantity, 10);
    const result = await checkSlip(req.file.buffer, expectedAmount);
    if (!result.valid) {
      return res.json(result);
    }

    if (result.billNumber) {
      const [dupRows] = await pool.query('SELECT id FROM orders WHERE bill_number = ?', [result.billNumber]);
      if (dupRows[0]) {
        return res.json({ valid: false, reason: 'ສະລິບນີ້ຖືກໃຊ້ໄປແລ້ວ ກະລຸນາອັບໂຫລດສະລິບໃໝ່' });
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, reason: 'ກວດສອບສະລິບບໍ່ສຳເລັດ' });
  }
});

// ລູກຄ້າສັ່ງຊື້ — ຕ້ອງ login ກ່ອນ
router.post('/', requireCustomerAuth, upload.single('slip'), async (req, res) => {
  try {
    const { product_id, quantity, customer_phone, customer_address } = req.body;

    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ error: 'ບໍ່ພົບສິນຄ້ານີ້' });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'ສິນຄ້າບໍ່ພໍ' });
    }
    if (!customer_phone || !customer_address) {
      return res.status(400).json({ error: 'ກະລຸນາໃສ່ເບີໂທ ແລະ ທີ່ຢູ່' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'ກະລຸນາອັບໂຫລດຮູບສະລິບໂອນເງິນ' });
    }

    const expectedAmount = product.price * parseInt(quantity, 10);
    const filePath = path.join(__dirname, '../public/uploads', req.file.filename);
    const buffer = fs.readFileSync(filePath);
    const result = await checkSlip(buffer, expectedAmount);

    if (!result.valid) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: result.reason || 'ສະລິບບໍ່ຖືກຕ້ອງ' });
    }

    if (result.billNumber) {
      const [dupRows] = await pool.query('SELECT id FROM orders WHERE bill_number = ?', [result.billNumber]);
      if (dupRows[0]) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'ສະລິບນີ້ຖືກໃຊ້ໄປແລ້ວ ກະລຸນາອັບໂຫລດສະລິບໃໝ່' });
      }
    }

    const slipImage = '/uploads/' + req.file.filename;

    const [insertResult] = await pool.query(
      `INSERT INTO orders (product_id, quantity, customer_phone, customer_address, slip_image, bill_number, customer_id, order_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_review')`,
      [product_id, quantity, customer_phone, customer_address, slipImage, result.billNumber || null, req.customerId]
    );

    await pool.query('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, product_id]);

    res.json({ id: insertResult.insertId, message: 'ສັ່ງຊື້ສຳເລັດ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ສັ່ງຊື້ບໍ່ສຳເລັດ' });
  }
});

// ✅ ອັບເດດສະຖານະອໍເດີ (ແອັດມິນ/ພະນັກງານ)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { order_status } = req.body;

    if (!VALID_STATUSES.includes(order_status)) {
      return res.status(400).json({ error: 'ສະຖານະບໍ່ຖືກຕ້ອງ' });
    }

    const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const order = orderRows[0];
    if (!order) {
      return res.status(404).json({ error: 'ບໍ່ພົບອໍເດີນີ້' });
    }
    if (order.order_status === 'cancelled') {
      return res.status(400).json({ error: 'ອໍເດີນີ້ຖືກຍົກເລີກໄປແລ້ວ ບໍ່ສາມາດປ່ຽນສະຖານະໄດ້' });
    }

    await pool.query('UPDATE orders SET order_status = ? WHERE id = ?', [order_status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ອັບເດດສະຖານະບໍ່ສຳເລັດ' });
  }
});

// ລູກຄ້າຍົກເລີກອໍເດີເອງ
router.post('/:id/cancel', requireCustomerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    const order = orderRows[0];

    if (!order) {
      return res.status(404).json({ error: 'ບໍ່ພົບອໍເດີນີ້' });
    }
    if (order.customer_id !== req.customerId) {
      return res.status(403).json({ error: 'ບໍ່ມີສິດຍົກເລີກອໍເດີນີ້' });
    }
    if (order.order_status !== 'awaiting_review') {
      return res.status(400).json({
        error: 'ອໍເດີນີ້ຖືກກວດສອບ/ດຳເນີນການໄປແລ້ວ ບໍ່ສາມາດຍົກເລີກເອງໄດ້ ກະລຸນາຕິດຕໍ່ຮ້ານຜ່ານແຊັດ'
      });
    }

    await pool.query(`UPDATE orders SET order_status = 'cancelled', cancelled_by = 'customer' WHERE id = ?`, [id]);
    await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [order.quantity, order.product_id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ຍົກເລີກອໍເດີບໍ່ສຳເລັດ' });
  }
});

// ✅ ແອັດມິນ/ພະນັກງານຍົກເລີກອໍເດີແທນລູກຄ້າ
router.post('/:id/admin-cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    const order = orderRows[0];

    if (!order) {
      return res.status(404).json({ error: 'ບໍ່ພົບອໍເດີນີ້' });
    }
    if (order.order_status === 'cancelled') {
      return res.status(400).json({ error: 'ອໍເດີນີ້ຖືກຍົກເລີກໄປແລ້ວ' });
    }

    await pool.query(`UPDATE orders SET order_status = 'cancelled', cancelled_by = 'staff' WHERE id = ?`, [id]);
    await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [order.quantity, order.product_id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ຍົກເລີກອໍເດີບໍ່ສຳເລັດ' });
  }
});

module.exports = router;