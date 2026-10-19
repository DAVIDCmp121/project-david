import { Navigate } from 'react-router-dom';

// ຫນ້ານີ້ຖືກລວມເຂົ້າກັບ "ຂໍ້ມູນບັນຊີ" ແລ້ວ — ພາໄປໜ້າໃໝ່ອັດຕະໂນມັດ
export default function AccountSecurity() {
  return <Navigate to="/menu/profile/info" replace />;
}