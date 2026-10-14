// ຄ່າສົ່ງ: ເກັບໃນຕາຕະລາງ settings (ແອດມິນແກ້ໄດ້ຈາກໜ້າອໍເດີ)
//   shipping_flat_fee  = ຄ່າສົ່ງເໝົາຕໍ່ອໍເດີ (ກີບ, 0 = ບໍ່ເກັບ)
//   free_shipping_min  = ຍອດສິນຄ້າຂັ້ນຕ່ຳທີ່ສົ່ງຟຣີ (ກີບ, 0 = ບໍ່ມີສົ່ງຟຣີ)
// ຖ້າຍັງບໍ່ເຄີຍຕັ້ງຄ່າ ໃຊ້ DEFAULTS

const DEFAULTS = { flat_fee: 30000, free_min: 1000000 };
const KEY_FEE = 'shipping_flat_fee';
const KEY_FREE = 'free_shipping_min';
const MAX_AMOUNT = 100000000;

async function getShippingConfig(db) {
  const cfg = { ...DEFAULTS };
  try {
    const [rows] = await db.query(
      'SELECT `key`, value FROM settings WHERE `key` IN (?, ?)',
      [KEY_FEE, KEY_FREE]
    );
    rows.forEach((r) => {
      const n = parseInt(r.value, 10);
      if (Number.isNaN(n) || n < 0) return;
      if (r.key === KEY_FEE) cfg.flat_fee = n;
      if (r.key === KEY_FREE) cfg.free_min = n;
    });
  } catch (err) {
    console.error('ອ່ານຄ່າສົ່ງບໍ່ໄດ້ ໃຊ້ຄ່າເລີ່ມຕົ້ນ:', err.message);
  }
  return cfg;
}

// subtotal = ຍອດສິນຄ້າກ່ອນຫັກຄູປອງ
function calcShippingFee(cfg, subtotal) {
  if (!cfg.flat_fee || cfg.flat_fee <= 0) return 0;
  if (cfg.free_min > 0 && subtotal >= cfg.free_min) return 0;
  return cfg.flat_fee;
}

// ຄືນ null ຖ້າຄ່າບໍ່ຖືກຕ້ອງ
function parseShippingInput(body) {
  const fee = Number(body && body.flat_fee);
  const freeMin = Number(body && body.free_min);
  const ok = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_AMOUNT;
  if (!ok(fee) || !ok(freeMin)) return null;
  return { flat_fee: fee, free_min: freeMin };
}

async function saveShippingConfig(db, cfg) {
  const sql = `INSERT INTO settings (\`key\`, value) VALUES (?, ?)
               ON DUPLICATE KEY UPDATE value = VALUES(value)`;
  await db.query(sql, [KEY_FEE, String(cfg.flat_fee)]);
  await db.query(sql, [KEY_FREE, String(cfg.free_min)]);
}

module.exports = { getShippingConfig, calcShippingFee, parseShippingInput, saveShippingConfig };