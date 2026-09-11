import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost } from '../api.js';

// ➕ ນຳໜ້າທີ່ຂອງ auth-guard.js ເກົ່າມາເຮັດເປັນ Layout Component
// - ເຊັກວ່າ login ຢູ່ບໍ່ (/api/auth/me), ຖ້າບໍ່ login ເດັ້ງໄປໜ້າ login ທີ່ຖືກຕ້ອງ
// - ໂຊວ໌ແຖບເທິງ "ສະບາຍດີ, [ຊື່] ([ບົດບາດ])" + ປຸ່ມອອກຈາກລະບົບ
// - ເຊື່ອງ nav item ທີ່ຕິດ [data-admin-only] ຖ້າຄົນ login ບໍ່ແມ່ນ role admin

const NAV_ITEMS = [
  { key: 'products', label: 'ສິນຄ້າ', href: '/admin' },
  { key: 'orders', label: 'ຄຳສັ່ງຊື້', href: '/admin/orders' },
  { key: 'qrcode', label: 'QR Code', href: '/admin/qrcode' },
  { key: 'chat', label: 'ແຊັດ', href: '/admin/chat' },
  { key: 'customers', label: 'ລູກຄ້າ', href: '/admin/customers' },
  { key: 'staff', label: 'ພະນັກງານ', href: '/admin/staff', adminOnly: true },
];

export default function AdminLayout({ children, active }) {
  const [admin, setAdmin] = useState(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiGet('/api/auth/me');
      if (!ok) {
        const isStaffPath = location.pathname.startsWith('/staff');
        navigate(isStaffPath ? '/staff/login' : '/admin/login', { replace: true });
        return;
      }
      setAdmin({ ...data, role: data.role || 'admin' });
      setChecked(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await apiPost('/api/auth/logout', {});
    navigate(admin?.role === 'admin' ? '/admin/login' : '/staff/login', { replace: true });
  }

  if (!checked) {
    return <div className="admin-shell" />;
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <span>ສະບາຍດີ, {admin.name} ({admin.role === 'admin' ? 'ແອດມິນ' : 'ພະນັກງານ'})</span>
        <button onClick={handleLogout}>ອອກຈາກລະບົບ</button>
      </div>

      <header className="admin-header">
        <h1>ຈັດການຮ້ານ</h1>
        <nav>
          {NAV_ITEMS.filter((item) => !item.adminOnly || admin.role === 'admin').map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={active === item.key ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); navigate(item.href); }}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
