const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');
const { EFFECTIVE_PRICE_SQL, PROMO_ACTIVE_SQL, parseSizeOptions } = require('../utils/pricing');
const { findVariant } = require('../utils/variants');

// ດຶງຕະກຣ້າຂອງລູກຄ້າທີ່ login ຢູ່
// stock = ສະຕັອກຂອງໄຊສ໌ທີ່ລູກຄ້າເລືອກ (ຖ້າບໍ່ມີ variant ຈະໃຊ້ products.stock ແທນ)
router.get('/', requireCustomerAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        cart_items.id,
        cart_items.quantity,
        cart_items.size AS chosen_size,
        products.id AS product_id,
        products.name,
        ${EFFECTIVE_PRICE_SQL} AS price,
        products.price AS original_price,
        ${PROMO_ACTIVE_SQL} AS is_promo,
        products.image,
        products.stock,
        products.size,
        products.color
      FROM cart_items
      JOIN products ON products.id = cart_items.product_id
      WHERE cart_items.customer_id = ?
      ORDER BY cart_items.added_at DESC
    `, [req.customerId]);

    // ດຶງສະຕັອກຕໍ່ໄຊສ໌ ແລ້ວຈັບຄູ່ໃນ JS (ບໍ່ JOIN ຕາມຂໍ້ຄວາມໄຊສ໌ ເພື່ອກັນບັນຫາ collation)
    const productIds = [...new Set(rows.map((r) => r.product_id))];
    const stockMap = {};
    if (productIds.length > 0) {
      const [vs] = await pool.query(
        'SELECT product_id, size, stock_qty FROM product_variants WHERE product_id IN (?) AND active = 1',
        [productIds]
      );
      for (const v of vs) {
        stockMap[`${v.product_id}|${v.size}`] = v.stock_qty;
      }
    }

    const items = rows.map((it) => {
      const key = `${it.product_id}|${it.chosen_size || ''}`;
      const sq = stockMap[key];
      return { ...it, stock: sq !== undefined ? sq : it.stock };
    });

    res.json({ success: true, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ດຶງຂໍ້ມູນຕະກຣ້າບໍ່ສຳເລັດ' });
  }
});

// ເພີ່ມສິນຄ້າລົງຕະກຣ້າ (ຖ້າມີຢູ່ແລ້ວໃຫ້ບວກຈຳນວນເພີ່ມ) — ກວດສະຕັອກຕາມໄຊສ໌ກ່ອນເພີ່ມ
router.post('/', requireCustomerAuth, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    if (!product_id) {
      return res.status(400).json({ success: false, error: 'ບໍ່ພົບສິນຄ້າ' });
    }

    const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ success: false, error: 'ບໍ່ພົບສິນຄ້ານີ້' });
    }

    // ສິນຄ້າທີ່ຕ້ອງເລືອກໄຊສ໌: ຕ້ອງສົ່ງໄຊສ໌ມາ ແລະ ຕ້ອງຢູ່ໃນຕົວເລືອກ
    const options = Number(product.size_selectable) === 1 ? parseSizeOptions(product.size) : [];
    let size = String(req.body.size || '').trim();
    if (options.length > 0) {
      if (!size) {
        return res.status(400).json({ success: false, error: 'ກະລຸນາເລືອກໄຊສ໌' });
      }
      if (!options.includes(size)) {
        return res.status(400).json({ success: false, error: 'ໄຊສ໌ບໍ່ຖືກຕ້ອງ' });
      }
    } else {
      size = '';
    }

    // ກວດສະຕັອກຂອງໄຊສ໌ນີ້
    const variant = await findVariant(pool, product.id, size);
    if (!variant) {
      return res.status(400).json({ success: false, error: 'ສິນຄ້ານີ້ຍັງບໍ່ພ້ອມຂາຍ' });
    }

    const [existing] = await pool.query(
      'SELECT id, quantity FROM cart_items WHERE customer_id = ? AND product_id = ? AND size = ?',
      [req.customerId, product_id, size]
    );
    const inCart = existing[0] ? existing[0].quantity : 0;

    if (variant.stock_qty <= 0) {
      return res.status(400).json({ success: false, error: 'ສິນຄ້ານີ້ໝົດແລ້ວ' });
    }
    if (inCart + qty > variant.stock_qty) {
      const left = variant.stock_qty - inCart;
      return res.status(400).json({
        success: false,
        error: left > 0
          ? `ເພີ່ມໄດ້ອີກພຽງ ${left} ອັນ (ໃນຕະກຣ້າມີ ${inCart} ອັນແລ້ວ)`
          : `ໃນຕະກຣ້າມີຄົບສະຕັອກແລ້ວ (${variant.stock_qty} ອັນ)`,
      });
    }

    if (existing[0]) {
      await pool.query(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [qty, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (customer_id, product_id, quantity, size) VALUES (?, ?, ?, ?)',
        [req.customerId, product_id, qty, size]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ເພີ່ມສິນຄ້າລົງຕະກຣ້າບໍ່ສຳເລັດ' });
  }
});

// ແກ້ຈຳນວນສິນຄ້າໃນຕະກຣ້າ — ຈຳນວນຕ້ອງບໍ່ເກີນສະຕັອກຂອງໄຊສ໌ນັ້ນ
router.put('/:id', requireCustomerAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!qty || qty < 1) {
      return res.status(400).json({ success: false, error: 'ຈຳນວນບໍ່ຖືກຕ້ອງ' });
    }

    const [rows] = await pool.query(
      'SELECT id, product_id, size FROM cart_items WHERE id = ? AND customer_id = ?',
      [req.params.id, req.customerId]
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'ບໍ່ພົບລາຍການນີ້ໃນຕະກຣ້າ' });
    }

    const variant = await findVariant(pool, rows[0].product_id, rows[0].size);
    if (variant && qty > variant.stock_qty) {
      return res.status(400).json({
        success: false,
        error: variant.stock_qty > 0 ? `ສະຕັອກເຫຼືອພຽງ ${variant.stock_qty} ອັນ` : 'ສິນຄ້ານີ້ໝົດແລ້ວ',
      });
    }

    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [qty, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ແກ້ໄຂຈຳນວນບໍ່ສຳເລັດ' });
  }
});

// ລຶບສິນຄ້າອອກຈາກຕະກຣ້າ
router.delete('/:id', requireCustomerAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE id = ? AND customer_id = ?',
      [req.params.id, req.customerId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'ບໍ່ພົບລາຍການນີ້ໃນຕະກຣ້າ' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ລຶບສິນຄ້າອອກຈາກຕະກຣ້າບໍ່ສຳເລັດ' });
  }
});

// ລ້າງຕະກຣ້າທັງໝົດ
router.delete('/', requireCustomerAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE customer_id = ?', [req.customerId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ລ້າງຕະກຣ້າບໍ່ສຳເລັດ' });
  }
});

module.exports = router;