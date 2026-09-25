const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

// ดึงตะกราของลูกค้าที่ login อยู
router.get('/', requireCustomerAuth, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT
        cart_items.id,
        cart_items.quantity,
        products.id AS product_id,
        products.name,
        products.price,
        products.image,
        products.stock,
        products.size,
        products.color
      FROM cart_items
      JOIN products ON products.id = cart_items.product_id
      WHERE cart_items.customer_id = ?
      ORDER BY cart_items.added_at DESC
    `, [req.customerId]);

    res.json({ success: true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ດງຂມນຕະກຣາບສເລັດ' });
  }
});

// เพิ่มสินคาลงตะกร้า (ถ้ามีอยู่แล้วใหบวกจำนวนเพิ่ม)
router.post('/', requireCustomerAuth, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'ບພບສນຄານ' });
    }

    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!productRows[0]) {
      return res.status(404).json({ success: false, error: 'ບພບສິນຄ້ານ' });
    }

    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE customer_id = ? AND product_id = ?',
      [req.customerId, product_id]
    );

    if (existing[0]) {
      await pool.query(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [qty, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (customer_id, product_id, quantity) VALUES (?, ?, ?)',
        [req.customerId, product_id, qty]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ເພມສນຄາລງຕະກຣ້າບສເລດ' });
  }
});

// แก้จำนวนสินค้าในตะกรา
router.put('/:id', requireCustomerAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, error: 'ຈຳນວນບໍ່ຖືກຕ້ອງ' });
    }

    const [rows] = await pool.query(
      'SELECT id FROM cart_items WHERE id = ? AND customer_id = ?',
      [req.params.id, req.customerId]
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'ບໍພົບລາຍການນໃນຕະກຣ້າ' });
    }

    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [qty, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ແກໄຂຈນວນບສເລດ' });
  }
});

// ลบสินคาออกจากตะกร้า
router.delete('/:id', requireCustomerAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE id = ? AND customer_id = ?',
      [req.params.id, req.customerId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'ບພບລາຍການນີໃນຕະກຣ້າ' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ລບສິນຄ້າອອກຈາກຕະກຣ້າບສເລັດ' });
  }
});

// ล้างตะกร้าทงหมด (เรียกใช้เองหลงสงซือสำเร็จกได้)
router.delete('/', requireCustomerAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE customer_id = ?', [req.customerId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ລາງຕະກຣ້າບສເລດ' });
  }
});

module.exports = router;