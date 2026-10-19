// ຟັງຊັນຊ່ວຍເລື່ອງສະຕັອກຕາມໄຊສ໌ (ຕາຕະລາງ product_variants)
// ໃຊ້ຮ່ວມກັນໃນ db.js / products.js / orders.js
// ໝາຍເຫດ: ໄຟລ໌ນີ້ບໍ່ import db.js ເພື່ອກັນ require ວົນກັນ — ຮັບ conn (pool ຫຼື connection) ເຂົ້າມາເອງ

// ຕັດຂໍ້ຄວາມໄຊສ໌ "L/M/XL" ເປັນລາຍການ ["L","M","XL"]
function splitSizes(text) {
  const parts = String(text || '')
    .split(/[\/\\,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

// ສ້າງລາຍການ variant ຈາກຂໍ້ມູນສິນຄ້າເກົ່າ (ໃຊ້ຕອນ migrate ແລະ ຕອນສ້າງສິນຄ້າແບບເກົ່າ)
// - ສິນຄ້າທີ່ເລືອກໄຊສ໌ໄດ້: ແຍກເປັນຫຼາຍໄຊສ໌ ແລ້ວແບ່ງສະຕັອກເທົ່າໆກັນ (ຕົວເລກຊົ່ວຄາວ ຕ້ອງໄປແກ້ໃນໜ້າແອດມິນ)
// - ສິນຄ້າທີ່ເລືອກໄຊສ໌ບໍ່ໄດ້: 1 variant (size = '')
function deriveVariantList(sizeText, sizeSelectable, stock) {
  const total = Math.max(0, parseInt(stock, 10) || 0);
  const sizes = Number(sizeSelectable) === 1 ? splitSizes(sizeText) : [];
  if (sizes.length === 0) return [{ size: '', stock_qty: total }];
  const base = Math.floor(total / sizes.length);
  const rest = total - base * sizes.length;
  return sizes.map((s, i) => ({ size: s, stock_qty: base + (i === 0 ? rest : 0) }));
}

// ລະຫັດສິນຄ້າ (SKU) ອັດຕະໂນມັດ ເຊັ່ນ P12-M
function makeSku(productId, size) {
  const clean = String(size || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  return clean ? `P${productId}-${clean}` : `P${productId}`;
}

// ຫາ variant ຂອງສິນຄ້າຕາມໄຊສ໌
// ຖ້າຫາບໍ່ເຈິ ແຕ່ສິນຄ້ານັ້ນມີ variant ດຽວ ກໍໃຊ້ອັນນັ້ນ (ຮອງຮັບຂໍ້ມູນເກົ່າ)
async function findVariant(conn, productId, size) {
  const sz = String(size || '').trim();
  const [exact] = await conn.query(
    'SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND active = 1 LIMIT 1',
    [productId, sz]
  );
  if (exact[0]) return exact[0];
  const [all] = await conn.query(
    'SELECT * FROM product_variants WHERE product_id = ? AND active = 1',
    [productId]
  );
  if (all.length === 1) return all[0];
  return null;
}

// ອັບເດດ products.stock ໃຫ້ເທົ່າກັບຜົນລວມສະຕັອກທຸກໄຊສ໌
async function syncProductStock(conn, productId) {
  await conn.query(
    `UPDATE products
     SET stock = (SELECT COALESCE(SUM(stock_qty), 0) FROM product_variants WHERE product_id = ? AND active = 1)
     WHERE id = ?`,
    [productId, productId]
  );
}

// ປ່ຽນສະຕັອກ (+ເພີ່ມ / -ຫຼຸດ) ແລະ ບັນທຶກປະຫວັດລົງ stock_movements ສະເໝີ
// ຖ້າຫຼຸດແລ້ວຕິດລົບ ຈະບໍ່ຫັກ ແລະ return false
async function adjustStock(conn, { variantId, productId, change, reason, channel = 'online', orderId = null, note = null }) {
  if (change < 0) {
    const [r] = await conn.query(
      'UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ? AND stock_qty + ? >= 0',
      [change, variantId, change]
    );
    if (r.affectedRows === 0) return false;
  } else {
    await conn.query('UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?', [change, variantId]);
  }
  await conn.query(
    `INSERT INTO stock_movements (variant_id, product_id, change_qty, reason, channel, order_id, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [variantId, productId, change, reason, channel, orderId, note]
  );
  await syncProductStock(conn, productId);
  return true;
}

// ບັນທຶກລາຍການໄຊສ໌ + ຈຳນວນສະຕັອກທີ່ແອດມິນສົ່ງມາ (ຮູບແບບໃໝ່)
// ໄຊສ໌ທີ່ບໍ່ຢູ່ໃນລາຍການ ຈະຖືກປິດ (active = 0) ບໍ່ລຶບ ເພື່ອເກັບປະຫວັດ
async function saveVariantList(conn, productId, rawList) {
  const list = [];
  const seen = new Set();
  for (const r of rawList || []) {
    const size = String((r && r.size) || '').trim().slice(0, 50);
    if (seen.has(size)) continue;
    seen.add(size);
    const stockQty = Math.max(0, parseInt(r && r.stock_qty, 10) || 0);
    const lowRaw = parseInt(r && r.low_stock_alert, 10);
    const low = Number.isInteger(lowRaw) && lowRaw >= 0 ? lowRaw : 2;
    list.push({ size, stockQty, low });
  }
  if (list.length === 0) return;

  for (const v of list) {
    const [rows] = await conn.query(
      'SELECT id, stock_qty FROM product_variants WHERE product_id = ? AND size = ?',
      [productId, v.size]
    );
    let variantId;
    let oldQty = 0;
    const existed = !!rows[0];
    if (existed) {
      variantId = rows[0].id;
      oldQty = rows[0].stock_qty;
      await conn.query('UPDATE product_variants SET active = 1, low_stock_alert = ? WHERE id = ?', [v.low, variantId]);
    } else {
      const [ins] = await conn.query(
        'INSERT INTO product_variants (product_id, size, sku, stock_qty, low_stock_alert) VALUES (?, ?, ?, 0, ?)',
        [productId, v.size, makeSku(productId, v.size), v.low]
      );
      variantId = ins.insertId;
    }
    const diff = v.stockQty - oldQty;
    if (diff !== 0) {
      await adjustStock(conn, {
        variantId,
        productId,
        change: diff,
        reason: existed ? 'adjust' : 'initial',
        channel: 'admin',
      });
    }
  }

  const sizes = list.map((v) => v.size);
  await conn.query('UPDATE product_variants SET active = 0 WHERE product_id = ? AND size NOT IN (?)', [productId, sizes]);
  await syncProductStock(conn, productId);

  // ຖ້າເລືອກໄຊສ໌ໄດ້ ໃຫ້ອັບເດດຂໍ້ຄວາມ products.size ໃຫ້ກົງກັນ (ໜ້າເວັບເກົ່າຍັງອ່ານຈາກຊ່ອງນີ້)
  const [prodRows] = await conn.query('SELECT size_selectable FROM products WHERE id = ?', [productId]);
  if (prodRows[0] && Number(prodRows[0].size_selectable) === 1) {
    const names = list.map((v) => v.size).filter(Boolean);
    if (names.length > 0) {
      await conn.query('UPDATE products SET size = ? WHERE id = ?', [names.join('/'), productId]);
    }
  }
}

// ຮູບແບບເກົ່າ: ແອດມິນແກ້ໄຂແຕ່ຂໍ້ຄວາມໄຊສ໌ → ສ້າງ/ເປີດ variant ຕາມໄຊສ໌ໃໝ່ (ສະຕັອກເລີ່ມ 0) ແລະ ປິດອັນທີ່ບໍ່ຢູ່ແລ້ວ
async function ensureVariantsForSizes(conn, productId, sizeText, sizeSelectable) {
  let target = Number(sizeSelectable) === 1 ? splitSizes(sizeText) : [];
  if (target.length === 0) target = [''];

  for (const size of target) {
    const [rows] = await conn.query(
      'SELECT id FROM product_variants WHERE product_id = ? AND size = ?',
      [productId, size]
    );
    if (rows[0]) {
      await conn.query('UPDATE product_variants SET active = 1 WHERE id = ?', [rows[0].id]);
    } else {
      await conn.query(
        'INSERT INTO product_variants (product_id, size, sku, stock_qty) VALUES (?, ?, ?, 0)',
        [productId, size, makeSku(productId, size)]
      );
    }
  }
  await conn.query('UPDATE product_variants SET active = 0 WHERE product_id = ? AND size NOT IN (?)', [productId, target]);
  await syncProductStock(conn, productId);
}

module.exports = {
  splitSizes,
  deriveVariantList,
  makeSku,
  findVariant,
  syncProductStock,
  adjustStock,
  saveVariantList,
  ensureVariantsForSizes,
};