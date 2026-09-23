import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../api.js';

// ➕ ตอนนี้เหลือแค่โชวชื่อ/เบอร์ลกค้า — เมนู (ตะกรา/แชท/ออเดอร์/ออกจากระบบ) ย้ายไป BottomNav แล้ว

export default function CustomerHeader() {
  const [customer, setCustomer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiGet('/api/customer-auth/me');
      if (!ok) {
        navigate('/menu/login', { replace: true });
        return;
      }
      setCustomer(data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!customer) return null;

  const label = customer.name || customer.phone;

  return <div className="account-label">{label}</div>;
}