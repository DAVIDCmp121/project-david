const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireCustomerAuth = require('../middleware/requireCustomerAuth');

const BRANCH_CARRIERS = ['anousith', 'hal'];

function checkCarrier(req, res, next) {
  if (!BRANCH_CARRIERS.includes(req.params.carrier)) {
    return res.status(404).json({ error: 'ຂົນສົ່ງນີ້ຍັງບໍ່ມີຂໍ້ມູນສາຂາ' });
  }
  next();
}

// ລາຍຊື່ແຂວງ
router.get('/:carrier/provinces', requireCustomerAuth, checkCarrier, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT province_id, province_name
       FROM carrier_branches
       WHERE carrier = ? AND active = 1 AND province_id IS NOT NULL
       GROUP BY province_id, province_name
       ORDER BY province_name`,
      [req.params.carrier]
    );
    res.json({ provinces: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫລດແຂວງບໍ່ສຳເລັດ' });
  }
});

// ລາຍຊື່ເມືອງ ຂອງແຂວງທີ່ເລືອກ
router.get('/:carrier/districts', requireCustomerAuth, checkCarrier, async (req, res) => {
  try {
    const province = String(req.query.province || '');
    const [rows] = await pool.query(
      `SELECT DISTINCT district_name
       FROM carrier_branches
       WHERE carrier = ? AND active = 1 AND province_id = ? AND district_name IS NOT NULL AND district_name <> ''
       ORDER BY district_name`,
      [req.params.carrier, province]
    );
    res.json({ districts: rows.map((r) => r.district_name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫລດເມືອງບໍ່ສຳເລັດ' });
  }
});

// ລາຍຊື່ສາຂາ ຂອງແຂວງ + ເມືອງທີ່ເລືອກ
router.get('/:carrier/branches', requireCustomerAuth, checkCarrier, async (req, res) => {
  try {
    const province = String(req.query.province || '');
    const district = String(req.query.district || '');
    const [rows] = await pool.query(
      `SELECT branch_id, branch_code, name, address, phone
       FROM carrier_branches
       WHERE carrier = ? AND active = 1 AND province_id = ? AND district_name = ?
       ORDER BY name`,
      [req.params.carrier, province, district]
    );
    res.json({ branches: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫລດສາຂາບໍ່ສຳເລັດ' });
  }
});

module.exports = router;