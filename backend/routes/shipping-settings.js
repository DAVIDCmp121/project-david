const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { getShippingConfig, parseShippingInput, saveShippingConfig } = require('../utils/shipping');

router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await getShippingConfig(pool));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ໂຫຼດຄ່າສົ່ງບໍ່ສຳເລັດ' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const cfg = parseShippingInput(req.body);
    if (!cfg) {
      return res.status(400).json({ error: 'ຕົວເລກບໍ່ຖືກຕ້ອງ ກະລຸນາໃສ່ຈຳນວນເຕັມ 0 ຂຶ້ນໄປ' });
    }
    await saveShippingConfig(pool, cfg);
    res.json({ success: true, ...cfg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ບັນທຶກຄ່າສົ່ງບໍ່ສຳເລັດ' });
  }
});

module.exports = router;