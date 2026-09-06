// ➕ ຕົວຈັບຈຳນວນຄັ້ງທີ່ Login/ຢືນຢັນຕົວຕົນຜິດພາດ — ປ້ອງກັນການເດ PIN/ລະຫັດຜ່ານຊ້ຳໆ (brute force)
// ເກັບໄວ້ໃນຄວາມຈຳ (memory) ຂອງ server — ຈະຣີເຊັດຖ້າ server restart (ຍອມຮັບໄດ້ ເພາະ restart ບໍ່ເກີດເລື້ອຍ)

const attempts = new Map(); // key -> { count, lockUntil }

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // ລ໋ອກ 5 ນາທີ

function checkLocked(key) {
  const entry = attempts.get(key);
  if (!entry) return { locked: false };

  if (entry.lockUntil && entry.lockUntil > Date.now()) {
    const secondsLeft = Math.ceil((entry.lockUntil - Date.now()) / 1000);
    return { locked: true, secondsLeft };
  }

  // ໝົດເວລາລ໋ອກແລ້ວ ລ້າງອອກ
  if (entry.lockUntil && entry.lockUntil <= Date.now()) {
    attempts.delete(key);
  }

  return { locked: false };
}

function recordFailure(key) {
  const entry = attempts.get(key) || { count: 0, lockUntil: null };
  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockUntil = Date.now() + LOCK_DURATION_MS;
    entry.count = 0;
  }

  attempts.set(key, entry);
}

function clearAttempts(key) {
  attempts.delete(key);
}

module.exports = { checkLocked, recordFailure, clearAttempts };