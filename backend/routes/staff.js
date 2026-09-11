// Route ຈັດການບັນຊີພະນັກງານ (ສະເພາະແອດມິນເທົ່ານັ້ນ)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireAdminRole = require('../middleware/requireAdminRole');

// ດຶງລາຍຊື່ພະນັກງານ+ແອດມິນທັງໝົດ
router.get('/', requireAuth, requireAdminRole, (req, res) => {
 const staffList = db.prepare(
    'SELECT id, username, name, role FROM admins ORDER BY id DESC'
  ).all();
  res.json({ staff: staffList });
});

// ເພີ່ມພະນັກງານໃໝ່
router.post('/', requireAuth, requireAdminRole, async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ໂຕອັກສອນ' });
  }

  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'ຊື່ຜູ້ໃຊ້ນີ້ມີແລ້ວ' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const result = db.prepare(
    `INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, 'staff')`
  ).run(username, hashed, name);

  res.json({ success: true, id: result.lastInsertRowid });
});

// ລຶບພະນັກງານ (ຫ້າມລຶບບັນຊີແອດມິນ)
router.delete('/:id', requireAuth, requireAdminRole, (req, res) => {
  const { id } = req.params;
  const target = db.prepare('SELECT role FROM admins WHERE id = ?').get(id);

  if (!target) {
    return res.status(404).json({ error: 'ບໍ່ພົບບັນຊີນີ້' });
  }
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'ບໍ່ສາມາດລຶບບັນຊີແອດມິນໄດ້' });
  }

  db.prepare('DELETE FROM admins WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;