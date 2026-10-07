const { pool: db } = require('../db');

const BASE = 'https://hal.hal-logistics.la/api';
const HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  locale: 'lo',
  Referer: 'https://halexpress.la/',
};

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('STATUS:', res.status);
    console.error('BODY:', text.slice(0, 300));
    throw new Error('Response is not JSON: ' + url);
  }
}

async function main() {
  // 1) ຊື່ແຂວງ / ເມືອງ / ບ້ານ (ໃນສາຂາມີແຕ່ລະຫັດ)
  const filters = await getJson(`${BASE}/filter-branch`);
  const provinces = new Map((filters.provinces || []).map((p) => [p.id, p.name]));
  const districts = new Map((filters.districts || []).map((d) => [d.id, d.name]));
  const villages = new Map((filters.villages || []).map((v) => [v.id, v.name]));

  // 2) ສາຂາທັງໝົດ (ເອີ້ນຄັ້ງດຽວ)
  const data = await getJson(`${BASE}/v1/listing/branches?is_active=true`);
  const list = Array.isArray(data) ? data : Object.values(data).find(Array.isArray) || [];
  console.log('HAL branches from API:', list.length);

  const seen = [];
  let count = 0;

  for (const b of list) {
    if (b.deleted_at || b.is_hide || b.is_permanently_closed) continue;

    const provinceName = provinces.get(b.province_id) || null;
    const districtName = districts.get(b.district_id) || null;
    const villageName = villages.get(b.village_id) || null;
    if (!provinceName || !districtName) continue; // ບໍ່ມີຂໍ້ມູນພື້ນທີ່ ກໍ່ເລືອກບໍ່ໄດ້

    const phone = [b.tel, b.tel2].filter(Boolean).join(' / ');
    const branchId = String(b.id);
    seen.push(branchId);

    await db.query(
      `INSERT INTO carrier_branches
        (carrier, branch_id, branch_code, name, address, province_id, province_name, district_name, phone, lat, lng, active)
       VALUES ('hal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE branch_code=VALUES(branch_code), name=VALUES(name),
         address=VALUES(address), province_id=VALUES(province_id), province_name=VALUES(province_name),
         district_name=VALUES(district_name), phone=VALUES(phone), lat=VALUES(lat), lng=VALUES(lng),
         active=1, synced_at=CURRENT_TIMESTAMP`,
      [
        branchId,
        b.code || null,
        b.name,
        villageName ? `ບ້ານ ${villageName}` : null,
        String(b.province_id),
        provinceName,
        districtName,
        phone || null,
        b.lat != null ? String(b.lat) : null,
        b.lng != null ? String(b.lng) : null,
      ]
    );
    count++;
  }

  // ສາຂາທີ່ຫາຍໄປຈາກຕົ້ນທາງ → ປິດການໃຊ້ງານ (ບໍ່ລຶບ ເພາະອໍເດີເກົ່າອາດອ້າງອີງ)
  // ກັນພາດ: ຖ້າດຶງໄດ້ໜ້ອຍຜິດປົກກະຕິ ຈະບໍ່ປິດສາຂາເດີມ
  if (seen.length > 100) {
    await db.query(
      `UPDATE carrier_branches SET active = 0 WHERE carrier = 'hal' AND branch_id NOT IN (?)`,
      [seen]
    );
  } else {
    console.warn('⚠️ ດຶງໄດ້ໜ້ອຍຜິດປົກກະຕິ ຂ້າມການປິດສາຂາເກົ່າ');
  }

  console.log(`synced ${count} HAL branches`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});