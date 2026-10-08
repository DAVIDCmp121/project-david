const { pool: db } = require('../db'); // ถ้า db.js export เป็น { pool } ให้เปลี่ยนเป็น require('../db').pool

const URL = 'https://pro.api.anousith.express/graphql';
const QUERY = `query Branches($where: BranchWhereInput, $orderBy: OrderByInput, $skip: Int, $limit: Int) {
  branches(where: $where, orderBy: $orderBy, skip: $skip, limit: $limit) {
    total
    data {
      id_branch
      branch_name
      branch_address
      branch_code
      map_lat
      map_lng
      address_info
      mainBranches
      districtName
      contactInfo
      point
      public
      provinceID {
        id_state
        provinceName
        provinceCode
        province_map_lat
        province_map_lng
        addressInfo
      }
      districtNextDay {
        id_district
        districtName
      }
    }
  }
}`;

async function fetchPage(skip) {
  const res = await fetch(URL, {
    method: 'POST',
   headers: {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'authorization': 'undefined',
  'cache-control': 'no-cache',
  'content-type': 'application/json',
  'pragma': 'no-cache',
  'Referer': 'https://app.anousith.express/',
},
    body: JSON.stringify({
      operationName: 'Branches',
      query: QUERY,
      variables: { where: { isDeleted: 0 }, skip, limit: 100, orderBy: 'createdAt_DESC' },
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error('STATUS:', res.status);
    console.error('CONTENT-TYPE:', res.headers.get('content-type'));
    console.error('BODY:', text.slice(0, 300));
    throw new Error('Response is not JSON');
  }
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.branches;
}

async function main() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS carrier_branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      carrier VARCHAR(30) NOT NULL,
      branch_id VARCHAR(30) NOT NULL,
      branch_code VARCHAR(50),
      name VARCHAR(255),
      address VARCHAR(500),
      province_id VARCHAR(10),
      province_name VARCHAR(100),
      district_name VARCHAR(100),
      phone VARCHAR(100),
      lat VARCHAR(30),
      lng VARCHAR(30),
      active TINYINT DEFAULT 1,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_carrier_branch (carrier, branch_id)
    ) CHARACTER SET utf8mb4`);

  let skip = 0, total = Infinity, count = 0;
  const seen = [];
  while (skip < total) {
    const page = await fetchPage(skip);
    total = page.total;
    for (const b of page.data) {
      if (b.public !== 1) continue;
      seen.push(b.id_branch);
      await db.query(
        `INSERT INTO carrier_branches
          (carrier, branch_id, branch_code, name, address, province_id, province_name, district_name, phone, lat, lng, active)
         VALUES ('anousith',?,?,?,?,?,?,?,?,?,?,1)
         ON DUPLICATE KEY UPDATE branch_code=VALUES(branch_code), name=VALUES(name),
           address=VALUES(address), province_id=VALUES(province_id), province_name=VALUES(province_name),
           district_name=VALUES(district_name), phone=VALUES(phone), lat=VALUES(lat), lng=VALUES(lng),
           active=1, synced_at=CURRENT_TIMESTAMP`,
        [b.id_branch, b.branch_code, b.branch_name, b.branch_address,
         b.provinceID?.id_state, b.provinceID?.provinceName, b.districtName,
         b.contactInfo, b.map_lat, b.map_lng]
      );
      count++;
    }
    skip += 100;
    await new Promise(r => setTimeout(r, 300)); // เว้นจังหวะ ไม่ยิงถี่
  }
  // สาขาที่หายไปจากต้นทาง → ปิดการใช้งาน (ไม่ลบ เพราะออเดอร์เก่าอาจอ้างอิง)
  if (seen.length) {
    await db.query(
      `UPDATE carrier_branches SET active=0 WHERE carrier='anousith' AND branch_id NOT IN (?)`, [seen]);
  }
  console.log(`synced ${count} branches (total reported: ${total})`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });