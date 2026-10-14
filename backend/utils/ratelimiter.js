// ຕົວຈັບຈຳນວນຄັ້ງທີ່ Login/ຢືນຢັນຕົວຕົນຜິດ — ກັນການເດົາ PIN/ລະຫັດຜ່ານ (brute force)
// ເກັບໃນຄວາມຈຳຂອງ server: ຖ້າ server restart ຈະຣີເຊັດ
//
// ກົດ:
//  - ຜິດຄົບ MAX_ATTEMPTS ຄັ້ງ ພາຍໃນ WINDOW_MS → ລັອກ
//  - ລັອກຮອບທຳອິດ 5 ນາທີ, ຮອບສອງ 15 ນາທີ, ຮອບສາມຂຶ້ນໄປ 60 ນາທີ
//  - ຖ້າບໍ່ຜິດອີກ 24 ຊົ່ວໂມງ ລະດັບການລັອກຈະກັບເປັນຮອບທຳອິດ
//  - ເຂົ້າສຳເລັດ → clearAttempts ລ້າງທຸກຢ່າງ

const attempts = new Map(); // key -> { count, lockUntil, level, lastFail }

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const FORGET_MS = 24 * 60 * 60 * 1000;
const LOCK_STEPS_MS = [5, 15, 60].map((m) => m * 60 * 1000);

function secondsLeftOf(entry) {
  return Math.ceil((entry.lockUntil - Date.now()) / 1000);
}

function checkLocked(key) {
  const entry = attempts.get(key);
  if (!entry || !entry.lockUntil) return { locked: false };

  if (entry.lockUntil > Date.now()) {
    return { locked: true, secondsLeft: secondsLeftOf(entry) };
  }

  // ໝົດເວລາລັອກແລ້ວ (ເກັບ level ໄວ້ ເພື່ອໃຫ້ຮອບຕໍ່ໄປລັອກນານຂຶ້ນ)
  entry.lockUntil = null;
  return { locked: false };
}

// ຄືນຄ່າ { locked, secondsLeft?, attemptsLeft? } ເພື່ອໃຫ້ຜູ້ເອີ້ນຕອບລູກຄ້າໄດ້ທັນທີ
function recordFailure(key) {
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, lockUntil: null, level: 0, lastFail: 0 };

  if (entry.lockUntil && entry.lockUntil > now) {
    return { locked: true, secondsLeft: secondsLeftOf(entry), attemptsLeft: 0 };
  }

  if (now - entry.lastFail > FORGET_MS) entry.level = 0;
  if (now - entry.lastFail > WINDOW_MS) entry.count = 0;

  entry.count += 1;
  entry.lastFail = now;
  entry.lockUntil = null;

  let result;
  if (entry.count >= MAX_ATTEMPTS) {
    const step = LOCK_STEPS_MS[Math.min(entry.level, LOCK_STEPS_MS.length - 1)];
    entry.level += 1;
    entry.count = 0;
    entry.lockUntil = now + step;
    result = { locked: true, secondsLeft: secondsLeftOf(entry), attemptsLeft: 0 };
  } else {
    result = { locked: false, attemptsLeft: MAX_ATTEMPTS - entry.count };
  }

  attempts.set(key, entry);
  return result;
}

function clearAttempts(key) {
  attempts.delete(key);
}

// ລ້າງລາຍການທີ່ເກົ່າແລ້ວ ກັນ Map ໃຫຍ່ຂຶ້ນເລື້ອຍໆ
const cleaner = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    const unlocked = !entry.lockUntil || entry.lockUntil <= now;
    if (unlocked && now - entry.lastFail > FORGET_MS) attempts.delete(key);
  }
}, 10 * 60 * 1000);
if (cleaner.unref) cleaner.unref();

module.exports = { checkLocked, recordFailure, clearAttempts };