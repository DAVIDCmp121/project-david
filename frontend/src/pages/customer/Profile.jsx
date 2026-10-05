import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { PersonCircle, HeartCircle, Chevron } from '../../components/SettingsIcons.jsx';
import { apiGet, apiPost, clearToken } from '../../api';

/* ---------- ເກນລະດັບສະມາຊິກ (ຍອດຊື້ສະສົມ ກີບ, ນັບສະເພາະອໍເດີ "ຮອດແລ້ວ") ---------- */
const TIERS = [
  { name: 'Member', min: 0 },
  { name: 'Silver', min: 2000000 },
  { name: 'Gold', min: 5000000 },
  { name: 'Platinum', min: 10000000 },
];

// ສະຖານະທີ່ນັບວ່າ "ກຳລັງດຳເນີນການ" — key ຕ້ອງກົງກັບ order_status ໃນ Orders.jsx
const IN_PROGRESS = ['awaiting_review', 'confirmed', 'shipped'];

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

/* ---------- ໄອຄອນ ---------- */
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

const IconPin = ({ color = '#111', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const IconShield = ({ color = '#111', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const IconLogout = ({ color = 'currentColor', size = 18 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
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

/* ລະດັບສະມາຊິກ */
.pf-tier { border-top: 1px solid var(--cust-border); padding: 14px 18px; }
.pf-tier-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pf-tier-badge {
  padding: 3px 12px; border-radius: 999px; background: #faf0cf; color: #9a7412;
  font-size: 0.8rem; font-weight: 800;
}
.pf-tier-spent { font-size: 0.85rem; color: var(--cust-text-muted); }
.pf-bar { height: 6px; border-radius: 999px; background: #f1ece0; margin-top: 10px; overflow: hidden; }
.pf-bar-fill { height: 100%; border-radius: 999px; background: var(--gold); }
.pf-tier-note { margin-top: 6px; font-size: 0.78rem; color: var(--cust-text-muted); line-height: 1.4; }

/* ສະຖິຕິສະຫຼຸບ */
.pf-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--cust-border); padding: 14px 6px;
}
.pf-stat { text-align: center; padding: 0 4px; }
.pf-stat + .pf-stat { border-left: 1px solid var(--cust-border); }
.pf-stat-num { font-size: 1.25rem; font-weight: 800; color: #b8862b; line-height: 1.2; }
.pf-stat-lb { margin-top: 2px; font-size: 0.74rem; color: var(--cust-text-muted); line-height: 1.3; }

/* ຫົວຂໍ້ກຸ່ມເມນູ */
.pf-sec-title {
  font-size: 0.85rem; font-weight: 700; color: var(--cust-text-muted);
  margin: 22px 4px 8px;
}

/* ແຖວເມນູ */
.pf-row {
  width: 100%; display: flex; align-items: center; gap: 14px; padding: 12px 16px;
  background: transparent; border: none; border-bottom: 1px solid var(--cust-border);
  border-radius: 0; cursor: pointer; text-align: left; font-family: inherit;
}
.pf-row:last-child { border-bottom: none; }
.pf-row:hover { background: #faf8f2; }
.pf-row:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.pf-row-text { flex: 1; min-width: 0; }
.pf-row-lb { display: block; font-size: 1rem; color: var(--cust-text); }
.pf-row-sub { display: block; margin-top: 2px; font-size: 0.78rem; color: var(--cust-text-muted); }

.pf-logout {
  margin-top: 28px; width: 100%; padding: 13px 10px; border-radius: 12px;
  border: 1px solid #dc2626; background: #fff; color: #dc2626; font-weight: bold;
  font-size: 0.95rem; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.pf-logout:hover { background: #dc2626; color: #fff; }

.pf-footer {
  margin-top: 14px; text-align: center; font-size: 0.75rem; color: var(--cust-text-muted);
}
`;

/* ---------- ສ່ວນຍ່ອຍ ---------- */
function Row({ icon, label, sub, onClick }) {
  return (
    <button className="pf-row" onClick={onClick}>
      {icon}
      <span className="pf-row-text">
        <span className="pf-row-lb">{label}</span>
        {sub ? <span className="pf-row-sub">{sub}</span> : null}
      </span>
      <Chevron />
    </button>
  );
}

function TierBlock({ spent }) {
  let idx = 0;
  TIERS.forEach((t, i) => {
    if (spent >= t.min) idx = i;
  });
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const pct = next ? Math.min(100, Math.round(((spent - current.min) / (next.min - current.min)) * 100)) : 100;

  return (
    <div className="pf-tier">
      <div className="pf-tier-head">
        <span className="pf-tier-badge">{current.name}</span>
        <span className="pf-tier-spent">ຍອດສະສົມ {fmt(spent)} ກີບ</span>
      </div>
      <div className="pf-bar">
        <div className="pf-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pf-tier-note">
        {next
          ? `ຍັງຂາດ ${fmt(next.min - spent)} ກີບ ເພື່ອເປັນ ${next.name}`
          : 'ທ່ານຢູ່ລະດັບສູງສຸດແລ້ວ'}
      </div>
    </div>
  );
}

function ProfileInner() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // { name, phone }
  const [stats, setStats] = useState(null); // { total, inProgress, delivered, spent }

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
          const list = ord.data.orders;
          const delivered = list.filter((o) => o.order_status === 'delivered');
          setStats({
            total: list.length,
            inProgress: list.filter((o) => IN_PROGRESS.includes(o.order_status)).length,
            delivered: delivered.length,
            spent: delivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          });
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
  const show = (n) => (stats ? n : '–');

  // ເພີ່ມເມນູໃໝ່ໃນອະນາຄົດ: ເພີ່ມລາຍການໃສ່ໃນ items ຂອງກຸ່ມທີ່ຕ້ອງການ
  const MENU_GROUPS = [
    {
      title: 'ບັນຊີ',
      items: [
        {
          icon: <PersonCircle />,
          label: 'ຂໍ້ມູນສ່ວນຕົວ',
          sub: 'ຊື່ ແລະ ເບີໂທ',
          to: '/menu/profile/info',
        },
        {
          icon: <Circle><IconPin /></Circle>,
          label: 'ທີ່ຢູ່ຈັດສົ່ງ',
          sub: 'ບັນທຶກໄວ້ໃຊ້ຕອນສັ່ງຊື້',
          to: '/menu/profile/addresses',
        },
        {
          icon: <HeartCircle />,
          label: 'ສິນຄ້າທີ່ຖືກໃຈ',
          to: '/menu/favorites',
        },
      ],
    },
    {
      title: 'ຄວາມປອດໄພ',
      items: [
        {
          icon: <Circle><IconShield /></Circle>,
          label: 'ຄວາມປອດໄພ',
          sub: 'ປ່ຽນ PIN, ວັນເກີດ ແລະ ລຶບບັນຊີ',
          to: '/menu/profile/security',
        },
      ],
    },
  ];

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="pf-wrap">
        <h1 className="pf-title">ບັນຊີຂອງຂ້ອຍ</h1>

        {/* 1. ການ໌ໂປຣໄຟລ໌ + ລະດັບ + ສະຖິຕິ */}
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

          {stats && <TierBlock spent={stats.spent} />}

          <div className="pf-stats">
            <div className="pf-stat">
              <div className="pf-stat-num">{show(stats?.total)}</div>
              <div className="pf-stat-lb">ອໍເດີທັງໝົດ</div>
            </div>
            <div className="pf-stat">
              <div className="pf-stat-num">{show(stats?.inProgress)}</div>
              <div className="pf-stat-lb">ກຳລັງດຳເນີນການ</div>
            </div>
            <div className="pf-stat">
              <div className="pf-stat-num">{show(stats?.delivered)}</div>
              <div className="pf-stat-lb">ຮອດແລ້ວ</div>
            </div>
          </div>
        </section>

        {/* 2. ກຸ່ມເມນູ */}
        {MENU_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="pf-sec-title">{group.title}</h2>
            <section className="pf-card">
              {group.items.map((it) => (
                <Row
                  key={it.to}
                  icon={it.icon}
                  label={it.label}
                  sub={it.sub}
                  onClick={() => navigate(it.to)}
                />
              ))}
            </section>
          </div>
        ))}

        {/* 3. ອອກຈາກລະບົບ */}
        <button className="pf-logout" onClick={handleLogout}>
          <IconLogout />
          ອອກຈາກລະບົບ
        </button>

        <div className="pf-footer">POLO SHOP v1.0.0</div>
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