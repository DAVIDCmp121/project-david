export const MONTHS = {
  lo: [
    'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
    'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ',
  ],
  th: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
};

// เรียงจากวันอาทิตย์
export const WEEKDAYS = {
  lo: ['ອາ', 'ຈ', 'ຄ', 'ພ', 'ພຫ', 'ສຸ', 'ສ'],
  th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};

export default {
  lo: {
    'df.clear': 'ລ້າງ',
    'df.prev': 'ເດືອນກ່ອນ',
    'df.next': 'ເດືອນຖັດໄປ',
  },
  th: {
    'df.clear': 'ล้าง',
    'df.prev': 'เดือนก่อน',
    'df.next': 'เดือนถัดไป',
  },
  en: {
    'df.clear': 'Clear',
    'df.prev': 'Previous month',
    'df.next': 'Next month',
  },
};