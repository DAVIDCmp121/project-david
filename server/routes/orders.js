const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const requireAuth = require('../middleware/requireAuth');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const sharp = require('sharp');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
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
    console.log('=== OCR TEXT ===', text);

    if (text.trim().length < 5) {
      return { valid: false, reason: 'ອ່ານຂໍ້ມູນຈາກຮູບບໍ່ໄດ້ ກະລຸນາອັບໂຫລດຮູບທີ່ຊັດເຈນກວ່ານີ້' };
    }

    const hasKeyword = SLIP_KEYWORDS.some(k => text.includes(k));
    if (!hasKeyword) {
      return { valid: false, reason: 'ຮູບທີ່ອັບໂຫລດບໍ່ແມ່ນສະລິບໂອນເງິນ' };
    }

    const amounts = extractAmounts(text);
    console.log('=== AMOUNTS FOUND ===', amounts, '| EXPECTED:', expectedAmount);
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
router.get('/', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT orders.*, products.name AS product_name, products.price
    FROM orders
    JOIN products ON orders.product_id = products.id
    ORDER BY orders.created_at DESC
  `).all();
  res.json(orders);
});

router.post('/verify-slip', uploadMemory.single('slip'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ valid: false, reason: 'ບໍ່ພົບຮູບ' });
  }

  const { product_id, quantity } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(404).json({ valid: false, reason: 'ບໍ່ພົບສິນຄ້ານີ້' });
  }

  const expectedAmount = product.price * parseInt(quantity, 10);
  const result = await checkSlip(req.file.buffer, expectedAmount);
  if (!result.valid) {
    return res.json(result);
  }

  if (result.billNumber) {
    const dup = db.prepare('SELECT id FROM orders WHERE bill_number = ?').get(result.billNumber);
    if (dup) {
      return res.json({ valid: false, reason: 'ສະລິບນີ້ຖືກໃຊ້ໄປແລ້ວ ກະລຸນາອັບໂຫລດສະລິບໃໝ່' });
    }
  }

  res.json(result);
});

// ✅ ລູກຄ້າສັ່ງຊື້ — ຕ້ອງ login ກ່ອນ (requireCustomerAuth) ເພື່ອຜູກ customer_id ກັບອໍເດີ
router.post('/', requireCustomerAuth, upload.single('slip'), async (req, res) => {
  const { product_id, quantity, customer_phone, customer_address } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
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
  const filePath = path.join(__dirname, '../../public/uploads', req.file.filename);
  const buffer = fs.readFileSync(filePath);
  const result = await checkSlip(buffer, expectedAmount);

  if (!result.valid) {
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: result.reason || 'ສະລິບບໍ່ຖືກຕ້ອງ' });
  }

  if (result.billNumber) {
    const dup = db.prepare('SELECT id FROM orders WHERE bill_number = ?').get(result.billNumber);
    if (dup) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'ສະລິບນີ້ຖືກໃຊ້ໄປແລ້ວ ກະລຸນາອັບໂຫລດສະລິບໃໝ່' });
    }
  }

  const slipImage = '/uploads/' + req.file.filename;

  // ➕ ເພີ່ມ customer_id (ຈາກ requireCustomerAuth) ແລະ order_status ຕັ້ງຕົ້ນ
  const stmt = db.prepare(`
    INSERT INTO orders (product_id, quantity, customer_phone, customer_address, slip_image, bill_number, customer_id, order_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_review')
  `);
  const insertResult = stmt.run(
    product_id, quantity, customer_phone, customer_address,
    slipImage, result.billNumber || null, req.customerId
  );

  db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

  res.json({ id: insertResult.lastInsertRowid, message: 'ສັ່ງຊື້ສຳເລັດ' });
});

router.put('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.post('/:id/cancel', requireCustomerAuth, (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

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

  db.prepare(`UPDATE orders SET order_status = 'cancelled' WHERE id = ?`).run(id);
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(order.quantity, order.product_id);

  res.json({ success: true });
});

module.exports = router;