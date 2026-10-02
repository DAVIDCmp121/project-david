import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { PersonCircle, HeartCircle, Chevron } from '../../components/SettingsIcons.jsx';
import { apiGet, apiPost, clearToken } from '../../api';

/* ---------- ໄອຄອນເພີ່ມໃໝ່ (ສະໄຕລ໌ດຽວກັບ SettingsIcons) ---------- */
const sv = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
};

function Circle({ size = 42, children }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid #e5e7eb',
        background: '#f9fafb',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

const IconReceipt = ({ color = '#111', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);
const IconClock = ({ color = '#111', size = 24 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IconCheck = ({ color = '#111', size = 24 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 3 3 5-6" />
  </svg>
);
const IconTruck = ({ color = '#111', size = 24 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M2 6h11v10H2zM13 10h4l3 3v3h-7" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="16.5" cy="17.5" r="1.8" />
  </svg>
);
const IconBox = ({ color = '#111', size = 24 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </svg>
);
const IconCart = ({ color = '#111', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.5L21 7H6" />
  </svg>
);
const IconChat = ({ color = '#111', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
  </svg>
);

/* ---------- CSS ---------- */
const css = `
.pf-wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 32px; }
.pf-title { font-size: 1.3rem; margin: 0 0 16px; color: var(--cust-text); }

.pf-card {
  background: #fff; border: 1px solid var(--cust-border); border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04); overflow: hidden;
}

/* ການ໌ໂປຣໄຟລ໌ */
.pf-user {
  display: flex; align-items: center; gap: 14px; width: 100%; padding: 18px;
  background: linear-gradient(135deg, #fffaf0 0%, #fff 70%);
  border: none; text-align: left; cursor: pointer; font-family: inherit;
}
.pf-avatar {
  width: 60px; height: 60px; border-radius: 50%; flex: 0 0 auto;
  background: var(--gold); color: #fff; font-size: 1.5rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.pf-user-info { flex: 1; min-width: 0; }
.pf-name {
  font-size: 1.1rem; font-weight: 700; color: var(--cust-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pf-name.empty { color: var(--cust-text-muted); font-weight: 500; }
.pf-phone { margin-top: 3px; font-size: 0.9rem; color: var(--cust-text-muted); }
.pf-edit {
  flex: 0 0 auto; padding: 6px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 700;
  border: 1px solid var(--gold); color: #b8862b; background: #fff;
}
.pf-user:hover .pf-edit { background: var(--gold); color: #fff; }

/* หัวข้อ section */
.pf-sec-head {
  display: flex; align-items: center; justify-content: space-between;
  margin: 22px 2px 10px;
}
.pf-sec-title { font-size: 1rem; font-weight: 700; color: var(--cust-text); margin: 0; }
.pf-sec-link {
  display: flex; align-items: center; gap: 2px; border: none; background: none; padding: 0;
  color: #b8862b; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit;
}

/* ທາງລັດສະຖານະອໍເດີ */
.pf-status { display: grid; grid-template-columns: repeat(4, 1fr); padding: 14px 6px; }
.pf-st {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 6px 2px; border: none; background: none; cursor: pointer; font-family: inherit;
  color: var(--cust-text); border-radius: 12px;
}
.pf-st:hover { background: #faf8f2; }
.pf-st-ic {
  position: relative; width: 46px; height: 46px; border-radius: 14px; background: #faf6ea;
  display: flex; align-items: center; justify-content: center;
}
.pf-st-lb { font-size: 0.74rem; line-height: 1.25; text-align: center; font-weight: 500; }
.pf-badge {
  position: absolute; top: -5px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 999px; background: #e53935; color: #fff; font-size: 0.68rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #fff;
}

/* ແຖວເມນູ */
.pf-row {
  width: 100%; display: flex; align-items: center; gap: 14px; padding: 12px 16px;
  background: transparent; border: none; border-bottom: 1px solid var(--cust-border);
  border-radius: 0; cursor: pointer; text-align: left; font-family: inherit;
}
.pf-row:last-child { border-bottom: none; }
.pf-row:hover { background: #faf8f2; }
.pf-row-lb { flex: 1; font-size: 1rem; color: var(--cust-text); }
.pf-row-tag {
  min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: #fdecea;
  color: #e53935; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
}

.pf-logout {
  margin-top: 28px; width: 100%; padding: 13px 10px; border-radius: 12px;
  border: 1px solid #dc2626; background: #fff; color: #dc2626; font-weight: bold;
  font-size: 0.95rem; cursor: pointer; font-family: inherit;
}
.pf-logout:hover { background: #dc2626; color: #fff; }
`;

/* ---------- ສ່ວນຍ່ອຍ ---------- */
function Row({ icon, label, onClick, tag }) {
  return (
    <button className="pf-row" onClick={onClick}>
      {icon}
      <span className="pf-row-lb">{label}</span>
      {tag ? <span className="pf-row-tag">{tag}</span> : null}
      <Chevron />
    </button>
  );
}

// ສະຖານະອໍເດີ — key ຕ້ອງກົງກັບ order_status ໃນ Orders.jsx
const STATUS_SHORTCUTS = [
  { key: 'awaiting_review', label: 'ລໍຖ້າກວດສະລິບ', Icon: IconClock, badge: true },
  { key: 'confirmed', label: 'ຢືນຢັນແລ້ວ', Icon: IconCheck, badge: true },
  { key: 'shipped', label: 'ຈັດສົ່ງແລ້ວ', Icon: IconTruck, badge: true },
  { key: 'delivered', label: 'ຮອດແລ້ວ', Icon: IconBox, badge: false },
];

function ProfileInner() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [user, setUser] = useState(null); // { name, phone }
  const [counts, setCounts] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [me, ord] = await Promise.all([
          apiGet('/api/customer-auth/me'),
          apiGet('/api/customer/orders'),
        ]);
        if (me.status === 401) {
          navigate('/menu/login');
          return;
        }
        if (me.ok) setUser({ name: me.data.name || '', phone: me.data.phone || '' });
        if (ord.ok && Array.isArray(ord.data.orders)) {
          const c = {};
          ord.data.orders.forEach((o) => {
            const k = o.order_status || 'awaiting_review';
            c[k] = (c[k] || 0) + 1;
          });
          setCounts(c);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    if (!window.confirm('ຢືນຢັນອອກຈາກລະບົບ?')) return;
    try {
      await apiPost('/api/customer-auth/logout', {});
    } catch (err) {}
    clearToken();
    navigate('/menu/login');
  }

  const name = user?.name || '';
  const initial = name ? Array.from(name)[0].toUpperCase() : null;

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="pf-wrap">
        <h1 className="pf-title">ບັນຊີຂອງຂ້ອຍ</h1>

        {/* 1. ການ໌ໂປຣໄຟລ໌ */}
        <section className="pf-card">
          <button className="pf-user" onClick={() => navigate('/menu/profile/info')}>
            <span className="pf-avatar">
              {initial || (
                <svg {...sv} width="28" height="28" stroke="#fff">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
                </svg>
              )}
            </span>
            <span className="pf-user-info">
              <div className={`pf-name${name ? '' : ' empty'}`}>{name || 'ຍັງບໍ່ໄດ້ຕັ້ງຊື່'}</div>
              <div className="pf-phone">{user?.phone || ' '}</div>
            </span>
            <span className="pf-edit">ແກ້ໄຂ</span>
          </button>
        </section>

        {/* 2. ທາງລັດສະຖານະອໍເດີ */}
        <div className="pf-sec-head">
          <h2 className="pf-sec-title">ອໍເດີຂອງຂ້ອຍ</h2>
          <button className="pf-sec-link" onClick={() => navigate('/menu/orders')}>
            ເບິ່ງທັງໝົດ <Chevron />
          </button>
        </div>
        <section className="pf-card pf-status">
          {STATUS_SHORTCUTS.map(({ key, label, Icon, badge }) => {
            const n = counts[key] || 0;
            return (
              <button key={key} className="pf-st" onClick={() => navigate(`/menu/orders?status=${key}`)}>
                <span className="pf-st-ic">
                  <Icon color="#b8862b" />
                  {badge && n > 0 && <span className="pf-badge">{n}</span>}
                </span>
                <span className="pf-st-lb">{label}</span>
              </button>
            );
          })}
        </section>

        {/* 3. ເມນູ */}
        <div className="pf-sec-head">
          <h2 className="pf-sec-title">ເມນູ</h2>
        </div>
        <section className="pf-card">
          <Row
            icon={<PersonCircle />}
            label="ຂໍ້ມູນສ່ວນຕົວ"
            onClick={() => navigate('/menu/profile/info')}
          />
          <Row
            icon={<HeartCircle />}
            label="ສິນຄ້າທີ່ຖືກໃຈ"
            onClick={() => navigate('/menu/favorites')}
          />
          <Row
            icon={<Circle><IconReceipt /></Circle>}
            label="ປະຫວັດການສັ່ງຊື້"
            onClick={() => navigate('/menu/orders')}
          />
          <Row
            icon={<Circle><IconCart /></Circle>}
            label="ກະຕ່າສິນຄ້າ"
            tag={cartCount > 0 ? cartCount : null}
            onClick={() => navigate('/menu/cart')}
          />
          <Row
            icon={<Circle><IconChat /></Circle>}
            label="ແຊັດກັບຮ້ານ"
            onClick={() => navigate('/menu/chat')}
          />
        </section>

        <button className="pf-logout" onClick={handleLogout}>
          ອອກຈາກລະບົບ
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <CartProvider>
      <ProfileInner />
    </CartProvider>
  );
}