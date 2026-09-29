const { pool } = require('../db');

// โปรใช้งานอยู่เมื่อ: เปิดโปร + มราคาโปร + ราคาโปรตกว่าปกติ + ยังไม่หมดวัน
const PROMO_ACTIVE_SQL = `(products.promo_active = 1
  AND products.promo_price IS NOT NULL
  AND products.promo_price < products.price
  AND (products.promo_end IS NULL OR products.promo_end >= CURDATE()))`;

const EFFECTIVE_PRICE_SQL = `(CASE WHEN ${PROMO_ACTIVE_SQL} THEN products.promo_price ELSE products.price END)`;

// ยอดขายรวม (ไม่นับออเดอร์ที่ยกเลิก)
const SOLD_COUNT_SQL = `(SELECT COALESCE(SUM(oi.quantity), 0)
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.product_id = products.id
    AND (o.order_status IS NULL OR o.order_status <> 'cancelled'))`;

const PRODUCT_EXTRA_COLUMNS = `${SOLD_COUNT_SQL} AS sold_count,
  ${PROMO_ACTIVE_SQL} AS is_promo_raw,
  DATE_FORMAT(products.promo_end, '%Y-%m-%d') AS promo_end_str`;

async function getBestsellerThreshold() {
  try {
    const [rows] = await pool.query("SELECT value FROM settings WHERE `key` = 'bestseller_threshold'");
    const n = rows[0] ? parseInt(rows[0].value, 10) : 10;
    return Number.isInteger(n) && n >= 1 ? n : 10;
  } catch (e) {
    return 10;
  }
}

function decorateProduct(p, threshold) {
  const isPromo = Number(p.is_promo_raw) === 1;
  const sold = Number(p.sold_count) || 0;
  const mode = p.bestseller_mode || 'auto';
  const isBest = mode === 'on' || (mode !== 'off' && sold >= threshold);
  const { is_promo_raw, promo_end_str, ...rest } = p;
  return {
    ...rest,
    promo_end: promo_end_str || null,
    sold_count: sold,
    is_promo: isPromo,
    final_price: isPromo ? p.promo_price : p.price,
    is_bestseller: isBest,
  };
}

// อานและตรวจคา promo / bestseller จาก req.body
function parseMarketingFields(body, basePrice) {
  const out = {};
  if (body.promo_active !== undefined) {
    out.promo_active = ['1', 'true', true, 1].includes(body.promo_active) ? 1 : 0;
  }
  if (body.promo_price !== undefined) {
    const v = String(body.promo_price).trim();
    out.promo_price = v === '' ? null : Number(v);
    if (out.promo_price !== null && !(out.promo_price > 0)) {
      return { error: 'ລາຄາໂປຣບຖກຕ້ອງ' };
    }
  }
  if (body.promo_end !== undefined) {
    const v = String(body.promo_end).trim();
    if (v === '') out.promo_end = null;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) out.promo_end = v;
    else return { error: 'ວນສິ້ນສຸດໂປຣບໍ່ຖືກຕ້ອງ' };
  }
  if (body.bestseller_mode !== undefined) {
    out.bestseller_mode = ['auto', 'on', 'off'].includes(body.bestseller_mode) ? body.bestseller_mode : 'auto';
  }
  if (out.promo_active === 1) {
    if (out.promo_price == null) return { error: 'ກະລຸນາໃສ່ລາຄາໂປຣ' };
    if (basePrice != null && !(out.promo_price < basePrice)) {
      return { error: 'ລາຄາໂປຣຕ້ອງຕ່ຳກວ່າລາຄາປົກກະຕິ' };
    }
  }
  return { fields: out };
}

module.exports = {
  PROMO_ACTIVE_SQL,
  EFFECTIVE_PRICE_SQL,
  SOLD_COUNT_SQL,
  PRODUCT_EXTRA_COLUMNS,
  getBestsellerThreshold,
  decorateProduct,
  parseMarketingFields,
};