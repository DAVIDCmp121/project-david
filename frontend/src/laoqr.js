// สร้าง LAO QR แบบฝังยอดเงิน (Dynamic) จากข้อมูล QR ร้านค้า BCEL OnePay ของร้าน
// ถ้าเปลี่ยนร้านค้า/บัญชีรับเงิน ให้ถอดรหัส QR ใหม่แล้วแก้ค่าในส่วน MERCHANT ด้านล่าง
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