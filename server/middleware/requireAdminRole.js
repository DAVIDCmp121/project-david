// ຕ້ອງໃຊ້ຄູ່ກັບ requireAuth ສະເໝີ (requireAuth ຕ້ອງມາກ່ອນ ເພື່ອຕິດ req.admin ໄວ້ແລ້ວ)
// ອະນຸຍາດສະເພາະຄົນທີ່ role ເປັນ 'admin' ເທົ່ານັ້ນ (ພະນັກງານ role 'staff' ຈະຖືກບລັອກ)
function requireAdminRole(req, res, next) {
  if (!req.admin || req.admin.role !== 'admin') {
    return res.status(403).json({ error: 'ສິດນີ້ສະເພາະແອດມິນເທົ່ານັ້ນ' });
  }
  next();
}

module.exports = requireAdminRole;