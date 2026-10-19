import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost } from '../api.js';
import { useLang, LangSwitcher } from '../i18n.jsx';

// Layout ໜ້າແອດມິນ: ເຊັກ login (/api/auth/me), ໂຊວ໌ແຖບເທິງ + ເມນູ
// ເມນູທີ່ມີ adminOnly ຈະເຫັນສະເພາະ role admin

const NAV_ITEMS = [
  { key: 'products', labelKey: 'menu.products', href: '/admin', icon: 'box' },
  { key: 'pos', labelKey: 'menu.pos', href: '/admin/pos', icon: 'cart' },
  { key: 'orders', labelKey: 'menu.orders', href: '/admin/orders', icon: 'receipt' },
  { key: 'customers', labelKey: 'menu.customers', href: '/admin/customers', icon: 'users' },
  { key: 'coupons', labelKey: 'menu.coupons', href: '/admin/coupons', icon: 'coupon' },
  { key: 'banners', labelKey: 'menu.banners', href: '/admin/banners', icon: 'image' },
  { key: 'qrcode', labelKey: 'menu.qr', href: '/admin/qrcode', icon: 'qr' },
  { key: 'chat', labelKey: 'menu.chat', href: '/admin/chat', icon: 'chat' },
  { key: 'dashboard', labelKey: 'menu.reports', href: '/admin/dashboard', icon: 'chart', adminOnly: true },
  { key: 'staff', labelKey: 'menu.staff', href: '/admin/staff', icon: 'id', adminOnly: true },
];

const ICONS = {
  box: <path d="M3.5 7.5 12 3l8.5 4.5V16.5L12 21l-8.5-4.5V7.5Z M3.5 7.5 12 12l8.5-4.5 M12 12v9" />,
  cart: <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6 M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z M17 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />,
  chart: <path d="M4 20V10 M10 20V4 M16 20v-7 M3 20h18" />,
  receipt: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z M9 8h6 M9 12h6" />,
  qr: <path d="M3.5 3.5h6v6h-6Z M14.5 3.5h6v6h-6Z M3.5 14.5h6v6h-6Z M14.5 14.5h3v3 M20.5 14.5v3h-3 M14.5 20.5h3" />,
  image: <path d="M4 5h16v14H4Z M4 16l5-5 4 4 3-3 4 4 M8.5 10a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" />,
  coupon: <path d="M3.5 8a2 2 0 0 0 0 4v4h17v-4a2 2 0 0 1 0-4V4h-17Z M9 4v14" strokeDasharray="2.5 2.5" />,
  chat: <path d="M4 4.5h16v11H8.5L4 19Z" />,
  users: <path d="M7.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M2.5 19c0-3 2.5-5 5-5s5 2 5 5 M16 11a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M14.5 14.3c2.4.3 4.5 2.1 4.5 4.7" />,
  id: <path d="M3.5 5.5h17v13h-17Z M7 9.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M4.5 16c.4-1.8 1.7-2.8 3.3-2.8s2.9 1 3.3 2.8 M13.5 9h5 M13.5 12.5h5" />,
};

function NavIcon({ kind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[kind] || ICONS.box}
    </svg>
  );
}

const CSS = `
.al-topbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 20px;font-size:.84rem;color:#4b5563;background:#f8f9fb;border-bottom:1px solid #e6e8ee}
.al-topbar button.al-logout{border:1px solid #d1d5db;background:#fff;color:#374151;padding:6px 14px;border-radius:8px;font-weight:600;font-size:.82rem;cursor:pointer;transition:background-color .15s,border-color .15s;white-space:nowrap}
.al-topbar button.al-logout:hover{background:#f3f4f6;border-color:#9ca3af}
.al-right{display:flex;align-items:center;gap:10px;flex:none}
.al-hello{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.al-header{background:#fff;border-bottom:1px solid #e6e8ee;padding:14px 20px 0}
.al-header h1{margin:0 0 12px;font-size:1.25rem;font-weight:800;color:#111827}

.al-nav{display:flex;align-items:center;gap:2px;overflow-x:auto;padding-bottom:10px;scrollbar-width:thin}
.al-nav::-webkit-scrollbar{height:5px}
.al-nav::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:999px}

.al-tab{flex:none;display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;font-size:.86rem;font-weight:600;color:#4b5563;text-decoration:none;white-space:nowrap;transition:background-color .15s,color .15s}
.al-tab svg{flex:none;opacity:.85}
.al-tab:hover{background:#f1f3f6;color:#111827}
.al-tab.on{background:#2563eb;color:#fff}
.al-tab.on svg{opacity:1}

.al-sep{flex:none;width:1px;align-self:stretch;margin:4px 6px;background:#e6e8ee}

@media (max-width:640px){
  .al-header{padding:12px 14px 0}
  .al-topbar{padding:8px 14px;font-size:.78rem}
  .al-tab{padding:7px 12px;font-size:.82rem}
}
`;

export default function AdminLayout({ children, active }) {
  const [admin, setAdmin] = useState(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();

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

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || admin.role === 'admin');
  const firstAdminOnlyIndex = items.findIndex((item) => item.adminOnly);
  const roleText = t(admin.role === 'admin' ? 'role.admin' : 'role.staff');

  return (
    <div className="admin-shell">
      <style>{CSS}</style>

      <div className="al-topbar">
        <span className="al-hello">{t('admin.hello', { name: admin.name, role: roleText })}</span>
        <div className="al-right">
          <LangSwitcher />
          <button className="al-logout" onClick={handleLogout}>{t('auth.logout')}</button>
        </div>
      </div>

      <header className="al-header">
        <h1>{t('admin.title')}</h1>
        <nav className="al-nav">
          {items.map((item, i) => (
            <span key={item.key} style={{ display: 'contents' }}>
              {i === firstAdminOnlyIndex && i > 0 && <span className="al-sep" aria-hidden="true" />}
              <a
                href={item.href}
                className={`al-tab${active === item.key ? ' on' : ''}`}
                aria-current={active === item.key ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); navigate(item.href); }}
              >
                <NavIcon kind={item.icon} />
                {t(item.labelKey)}
              </a>
            </span>
          ))}
        </nav>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}