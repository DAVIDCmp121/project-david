// Route ຈັດການບນຊີພະນກງານ (ສະເພາະແອດມນເທານນ)
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireAdminRole = require('../middleware/requireAdminRole');

router.get('/', requireAuth, requireAdminRole, async (req, res) => {
  const [staffList] = await pool.query(
    'SELECT id, username, name, role FROM admins ORDER BY id DESC'
  );
  res.json({ staff: staffList });
});

router.post('/', requireAuth, requireAdminRole, async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'ກະລນາປອນຂມນໃຫຄົບ' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ໂຕອັກສອນ' });
  }

  const [existingRows] = await pool.query('SELECT id FROM admins WHERE username = ?', [username]);
  if (existingRows.length > 0) {
    return res.status(409).json({ error: 'ຊືຜູໃຊນມແລວ' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, 'staff')`,
    [username, hashed, name]
  );

  res.json({ success: true, id: result.insertId });
});

router.delete('/:id', requireAuth, requireAdminRole, async (req, res) => {
  const { id } = req.params;
  const [targetRows] = await pool.query('SELECT role FROM admins WHERE id = ?', [id]);
  const target = targetRows[0];

  if (!target) {
    return res.status(404).json({ error: 'ບພບບນຊີນີ' });
  }
  if (target.role === 'admin') {
    return res.status(403).json({ error: 'ບໍ່ສາມາດລບບນຊີແອດມິນໄດ' });
  }

  await pool.query('DELETE FROM admins WHERE id = ?', [id]);
  res.json({ success: true });
});

module.exports = router;