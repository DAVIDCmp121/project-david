// สร้าง LAO QR แบบฝังยอดเงิน (Dynamic)
// 1) buildLaoQr(amount): ใช้ข้อมูลร้านค้า BCEL OnePay ที่ฝังไว้ในไฟล์นี้
//    (ใช้เฉพาะตอนที่แอดมินยังไม่ได้เพิ่มธนาคารในหน้าแอดมิน)
// 2) buildLaoQrFromTemplate(payload, amount): ใช้ข้อความ QR ของธนาคารที่แอดมินอัปโหลด
//    แล้วใส่ยอดเงิน + คำนวณ CRC ใหม่ (รองรับทุกธนาคารที่เป็น LAO QR มาตรฐาน EMVCo)
import QRCode from 'qrcode';

const MERCHANT = {
  unionpay15: '2031041800520446MCH19EFA28D64F',
  lapnet38:
    '0016A00526628466257701082771041802030020314mch19EFA28D64F',
  mcc: '5651',
  name: 'David Jommaphone',
  city: 'VT',
  extra62: '020995910840U',
};

function tlv(tag, value) {
  return tag + String(value.length).padStart(2, '0') + value;
}

// CRC16-CCITT (มาตรฐาน EMVCo)
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildLaoQrPayload(amount) {
  const n = Math.round(Number(amount));
  if (!n || n <= 0) throw new Error('invalid amount');

  const body =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = Dynamic (มียอดเงิน)
    tlv('15', MERCHANT.unionpay15) +
    tlv('38', MERCHANT.lapnet38) +
    tlv('52', MERCHANT.mcc) +
    tlv('53', '418') + // LAK
    tlv('54', String(n)) + // ยอดเงิน
    tlv('58', 'LA') +
    tlv('59', MERCHANT.name) +
    tlv('60', MERCHANT.city) +
    tlv('62', MERCHANT.extra62) +
    '6304';

  return body + crc16(body);
}

// คืนค่าเป็นรูป (data URL) ใช้ใส่ใน <img src> ได้เลย
export function buildLaoQr(amount) {
  return QRCode.toDataURL(buildLaoQrPayload(amount), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}

// ---------- แบบใช้ข้อความ QR ของธนาคารที่เลือก ----------

// แยกข้อความ EMV เป็นรายการ { tag, value } (ถ้ารูปแบบผิดจะ throw)
function parseTlv(str) {
  const items = [];
  let i = 0;
  while (i < str.length) {
    if (i + 4 > str.length) throw new Error('bad tlv');
    const tag = str.slice(i, i + 2);
    const len = parseInt(str.slice(i + 2, i + 4), 10);
    if (Number.isNaN(len)) throw new Error('bad tlv');
    const value = str.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error('bad tlv');
    items.push({ tag, value });
    i += 4 + len;
  }
  return items;
}

// เอาข้อความ QR เดิมของธนาคาร มาตั้งเป็น Dynamic + ใส่ยอดเงิน + คำนวณ CRC ใหม่
export function buildLaoQrPayloadFromTemplate(template, amount) {
  const n = Math.round(Number(amount));
  if (!n || n <= 0) throw new Error('invalid amount');

  const text = String(template || '').trim();
  if (!text.startsWith('000201') || text.length < 20) throw new Error('not an EMV QR');

  // ตรวจ CRC ของข้อความเดิม เพื่อให้แน่ใจว่าอ่านมาครบและถูกต้อง
  const crcOk =
    text.slice(-8, -4) === '6304' && crc16(text.slice(0, -4)) === text.slice(-4).toUpperCase();
  if (!crcOk) throw new Error('bad crc');

  const items = parseTlv(text).filter((x) => x.tag !== '54' && x.tag !== '63');
  items.forEach((x) => {
    if (x.tag === '01') x.value = '12'; // 12 = Dynamic
  });
  items.push({ tag: '54', value: String(n) });
  items.sort((a, b) => Number(a.tag) - Number(b.tag));

  const body = items.map((x) => tlv(x.tag, x.value)).join('') + '6304';
  return body + crc16(body);
}

export function buildLaoQrFromTemplate(template, amount) {
  return QRCode.toDataURL(buildLaoQrPayloadFromTemplate(template, amount), {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}

// ใช้ตอนแอดมินเพิ่มธนาคาร: ข้อความที่อ่านได้ใช้ฝังยอดได้ไหม
export function canBuildDynamic(text) {
  try {
    buildLaoQrPayloadFromTemplate(text, 1000);
    return true;
  } catch (e) {
    return false;
  }
}