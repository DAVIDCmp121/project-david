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

// ✅ ຍັງເກັບໄວ້ໃຫ້ /verify-slip ໃຊ້ (ອາດເອົາໄປໃຊ້ເປັນເຄື່ອງມືຊ່ວຍແອັດມິນພາຍຫຼັງ) — checkout ໃໝ່ບໍ່ເອີ້ນໃຊ້ຟັງຊັນນີ້ອີກຕໍ່ໄປ
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

// ✅ helper: ດຶງ cart ຂອງ customer ພ້ອມຂໍ້ມູນສິນຄ້າ ແລະ ຄຳນວນຍອດລວມ
async function getCartWithTotal(customerId) {
  const [items] = await pool.query(
    `SELECT cart_items.product_id, cart_items.quantity, products.price, products.stock, products.name
     FROM cart_items
     JOIN products ON cart_items.product_id = products.id
     WHERE cart_items.customer_id = ?`,
    [customerId]
  );
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items, total };
}

// ດຶງລາຍການອໍເດີທັງໝົດ (ແອັດມິນ/ພະນັກງານ) — ✅ ອັບເດດແລ້ວ: ດຶງ order_items ມາຮ່ວມນຳ ເພື່ອຮອງຮັບຫຼາຍສິນຄ້າຕໍ່ 1 ອໍເດີ
router.get('/', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT * FROM orders ORDER BY created_at DESC
    `);

    if (orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map(o => o.id);
    const [items] = await pool.query(
      `SELECT order_items.order_id, order_items.product_id, order_items.quantity,
              order_items.price_at_order, products.name AS product_name
       FROM order_items
       JOIN products ON order_items.product_id = products.id
       WHERE order_items.order_id IN (?)`,
      [orderIds]
    );

    const result = orders.map(order => {
      const orderItems = items.filter(it => it.order_id === order.id);
      const total = orderItems.reduce((sum, it) => sum + it.price_at_order * it.quantity, 0);
      return { ...order, items: orderItems, total };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ດຶງຂໍ້ມູນອໍເດີບໍ່ສຳເລັດ' });
  }
});

// ✅ ຍັງໃຊ້ໄດ້ (ບໍ່ລຶບ) ແຕ່ບໍ່ຖືກເອີ້ນໃຊ້ຈາກ checkout ໃໝ່ອີກຕໍ່ໄປ
router.post('/verify-slip', requireCustomerAuth, uploadMemory.single('slip'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ valid: false, reason: 'ບໍ່ພົບຮູບ' });
    }

    const { items, total } = await getCartWithTotal(req.customerId);
    if (items.length === 0) {
      return res.status(400).json({ valid: false, reason: 'ກະຕ່າສິນຄ້າຫວ່າງເປົ່າ' });
    }

    const result = await checkSlip(req.file.buffer, total);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, reason: 'ກວດສອບສະລິບບໍ່ສຳເລັດ' });
  }
});

// ✅ ລູກຄ້າສັ່ງຊື້ — ສ້າງ order ຈາກ cart_items ທັງໝົດ, ບໍ່ກວດ OCR ອີກຕໍ່ໄປ (ແອັດມິນກວດສະລິບເອງພາຍຫຼັງ)
router.post('/', requireCustomerAuth, upload.single('slip'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { customer_phone, customer_address } = req.body;

    if (!customer_phone || !customer_address) {
      return res.status(400).json({ error: 'ກະລຸນາໃສ່ເບີໂທ ແລະ ທີ່ຢູ່' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'ກະລຸນາອັບໂຫລດຮູບສະລິບໂອນເງິນ' });
    }

    const { items } = await getCartWithTotal(req.customerId);
    if (items.length === 0) {
      fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
      return res.status(400).json({ error: 'ກະຕ່າສິນຄ້າຫວ່າງເປົ່າ' });
    }

    const outOfStock = items.find(item => item.stock < item.quantity);
    if (outOfStock) {
      fs.unlinkSync(path.join(__dirname, '../public/uploads', req.file.filename));
      return res.status(400).json({ error: `ສິນຄ້າ "${outOfStock.name}" ບໍ່ພໍ` });
    }

    const slipImage = '/uploads/' + req.file.filename;

    await connection.beginTransaction();

    const [insertResult] = await connection.query(
      `INSERT INTO orders (customer_phone, customer_address, slip_image, customer_id, order_status)
       VALUES (?, ?, ?, ?, 'awaiting_review')`,
      [customer_phone, customer_address, slipImage, req.customerId]
    );
    const orderId = insertResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_order)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );
      await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await connection.query('DELETE FROM cart_items WHERE customer_id = ?', [req.customerId]);

    await connection.commit();
    res.json({ id: orderId, message: 'ສັ່ງຊື້ສຳເລັດ' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'ສັ່ງຊື້ບໍ່ສຳເລັດ' });
  } finally {
    connection.release();
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

async function restoreStockForOrder(orderId) {
  const [itemRows] = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
  for (const item of itemRows) {
    await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
  }
}

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
    await restoreStockForOrder(id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ຍົກເລີກອໍເດີບໍ່ສຳເລັດ' });
  }
});

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
    await restoreStockForOrder(id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ຍົກເລີກອໍເດີບໍ່ສຳເລັດ' });
  }
});

module.exports = router;