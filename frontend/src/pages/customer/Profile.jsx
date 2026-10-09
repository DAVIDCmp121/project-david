import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { PersonCircle, HeartCircle, Chevron } from '../../components/SettingsIcons.jsx';
import { apiGet, apiPost, clearToken } from '../../api';

/* ---------- ເສັ້ນທາງໜ້າອໍເດີ (ກວດໃນ App.jsx ວ່າຖືກບໍ່ ຖ້າບໍ່ຖືກໃຫ້ແກ້ບ່ອນນີ້) ---------- */
const ORDERS_PATH = '/menu/orders';

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

/* ---------- ທີມ (ມືດ / ສະຫວ່າງ) ---------- */
function getSavedTheme() {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch (err) {}
}

/* ---------- ໄອຄອນ ---------- */
const sv = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.8,
  viewBox: '0 0 24 24',
};

// ວົງມົນຄອບໄອຄອນ (ໂໝດມືດໃນ theme.css ຈັບຈາກ style border-radius: 50% ຢ່າປ່ຽນ)
function Circle({ size = 42, children }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid var(--cust-border)',
        background: 'var(--cust-surface-soft)',
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

const IconPin = ({ color = 'currentColor', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const IconMoon = ({ color = 'currentColor', size = 21 }) => (
  <svg {...sv} width={size} height={size} stroke={color}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
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
.pf-wrap { max-width: 1120px; margin: 0 auto; padding: 24px 18px 40px; }
.pf-title { font-size: 1.6rem; font-weight: 800; margin: 0 0 18px; color: var(--cust-text); }

/* ໂຄງ 2 ຄໍລຳ (ຈໍໃຫຍ່) / 1 ຄໍລຳ (ມືຖື) */
.pf-layout { display: grid; grid-template-columns: minmax(0, 480px) minmax(0, 1fr); gap: 24px; align-items: start; }
.pf-side { position: sticky; top: 88px; }
.pf-main { min-width: 0; }
.pf-main > :first-child > .pf-sec-title { margin-top: 0; }

.pf-card {
  background: var(--cust-surface); border: 1px solid var(--cust-border); border-radius: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04); overflow: hidden;
}

/* ການ໌ໂປຣໄຟລ໌ (ບໍ່ມີປຸ່ມແກ້ໄຂ — ແກ້ຊື່ໃນ "ຂໍ້ມູນບັນຊີ") */
.pf-user {
  display: flex; align-items: center; gap: 18px; width: 100%; padding: 28px 26px;
  background: linear-gradient(135deg, var(--cust-grad-from) 0%, var(--cust-surface) 70%);
}
.pf-avatar {
  width: 82px; height: 82px; border-radius: 50%; flex: 0 0 auto;
  background: var(--gold); color: #fff; font-size: 2.1rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px rgba(201, 162, 39, 0.32);
}
.pf-user-info { flex: 1; min-width: 0; display: block; }
.pf-name {
  display: block; font-size: 1.4rem; font-weight: 800; color: var(--cust-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pf-name.empty { color: var(--cust-text-muted); font-weight: 500; font-size: 1.15rem; }
.pf-phone { display: block; margin-top: 4px; font-size: 1.02rem; color: var(--cust-text-muted); }

/* ລະດັບສະມາຊິກ */
.pf-tier { border-top: 1px solid var(--cust-border); padding: 22px 26px; }
.pf-tier-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.pf-tier-badge {
  padding: 5px 16px; border-radius: 999px; background: var(--cust-badge-bg); color: var(--cust-badge-text);
  font-size: 0.95rem; font-weight: 800;
}
.pf-tier-spent { font-size: 0.95rem; color: var(--cust-text-muted); }
.pf-tier-spent b { color: var(--cust-text); font-size: 1.05rem; }
.pf-bar { height: 10px; border-radius: 999px; background: var(--cust-bar-bg); margin-top: 14px; overflow: hidden; }
.pf-bar-fill { height: 100%; border-radius: 999px; background: var(--gold); transition: width 0.5s ease; }
.pf-tier-note { margin-top: 9px; font-size: 0.9rem; color: var(--cust-text-muted); line-height: 1.4; }

/* ຂັ້ນບັນໄດລະດັບ */
.pf-ladder { display: grid; grid-template-columns: repeat(4, 1fr); list-style: none; margin: 18px 0 0; padding: 0; }
.pf-ladder li {
  position: relative; text-align: center; padding-top: 24px;
  font-size: 0.82rem; color: var(--cust-text-muted);
}
.pf-ladder li::before {
  content: ''; position: absolute; top: 6px; left: 0; right: 0; height: 2px; background: var(--cust-bar-bg);
}
.pf-ladder li::after {
  content: ''; position: absolute; top: 0; left: 50%; width: 14px; height: 14px; margin-left: -7px;
  border-radius: 50%; background: var(--cust-bar-bg); border: 2px solid var(--cust-surface);
}
.pf-ladder li:first-child::before { left: 50%; }
.pf-ladder li:last-child::before { right: 50%; }
.pf-ladder li.done::before, .pf-ladder li.done::after { background: var(--gold); }
.pf-ladder li.now { color: var(--cust-gold-text); font-weight: 800; }
.pf-ladder li.now::before { background: linear-gradient(90deg, var(--gold) 50%, var(--cust-bar-bg) 50%); }
.pf-ladder li.now:first-child::before { background: var(--cust-bar-bg); }
.pf-ladder li.now:last-child::before { background: var(--gold); }

/* ແຕ້ມ + ຄູປອງ */
.pf-quick { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 26px 22px; }
.pf-q {
  display: flex; flex-direction: column; gap: 3px; padding: 16px 18px; border-radius: 14px;
  border: 1px solid var(--cust-border); background: var(--cust-surface-soft); cursor: pointer;
  font-family: inherit; text-align: left;
}
.pf-q:hover { border-color: var(--gold); }
.pf-q-num { font-size: 1.8rem; font-weight: 800; color: var(--cust-gold-text); line-height: 1.15; }
.pf-q-lb { font-size: 0.88rem; color: var(--cust-text-muted); }

/* ສະຖິຕິອໍເດີ (ກົດໄດ້) */
.pf-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--cust-border);
}
.pf-stat {
  text-align: center; padding: 20px 6px; border: 0; background: none; border-radius: 0;
  cursor: pointer; font-family: inherit;
}
.pf-stat:hover { background: var(--cust-hover); }
.pf-stat + .pf-stat { border-left: 1px solid var(--cust-border); }
.pf-stat-num { font-size: 1.7rem; font-weight: 800; color: var(--cust-gold-text); line-height: 1.2; }
.pf-stat-lb { margin-top: 3px; font-size: 0.82rem; color: var(--cust-text-muted); line-height: 1.3; }

/* ຫົວຂໍ້ກຸ່ມເມນູ */
.pf-sec-title {
  font-size: 0.95rem; font-weight: 800; color: var(--cust-text);
  margin: 26px 4px 10px;
}

/* ແຖວເມນູ */
.pf-row {
  width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 18px;
  background: transparent; border: none; border-bottom: 1px solid var(--cust-border);
  border-radius: 0; cursor: pointer; text-align: left; font-family: inherit;
  color: var(--cust-text);
}
.pf-row:last-child { border-bottom: none; }
.pf-row:hover { background: var(--cust-hover); }
.pf-row:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.pf-row-text { flex: 1; min-width: 0; }
.pf-row-lb { display: block; font-size: 1rem; font-weight: 600; color: var(--cust-text); }
.pf-row-sub { display: block; margin-top: 2px; font-size: 0.8rem; color: var(--cust-text-muted); }

/* ປຸ່ມສະວິດ ມືດ/ສະຫວ່າງ */
.pf-switch {
  position: relative; flex: 0 0 auto; width: 46px; height: 26px; border-radius: 999px;
  background: #c9c9ce; transition: background 0.2s;
}
.pf-switch::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
  border-radius: 50%; background: #fff; transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.pf-switch.on { background: var(--gold); }
.pf-switch.on::after { transform: translateX(20px); }

.pf-logout {
  margin-top: 28px; width: 100%; padding: 13px 10px; border-radius: 12px;
  border: 1px solid #dc2626; background: var(--cust-surface); color: #dc2626; font-weight: bold;
  font-size: 0.95rem; cursor: pointer; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.pf-logout:hover { background: #dc2626; color: #fff; }

.pf-footer {
  margin-top: 14px; text-align: center; font-size: 0.75rem; color: var(--cust-text-muted);
}

/* ກຳລັງໂຫຼດ */
.pf-sk-wrap { padding: 20px 26px; border-top: 1px solid var(--cust-border); display: flex; flex-direction: column; gap: 12px; }
.pf-sk { border-radius: 10px; background: var(--cust-bar-bg); animation: pf-pulse 1.2s ease-in-out infinite; }
@keyframes pf-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

/* ໜ້າຈໍນ້ອຍ: 1 ຄໍລຳ */
@media (max-width: 900px) {
  .pf-layout { grid-template-columns: minmax(0, 1fr); }
  .pf-side { position: static; }
  .pf-wrap { max-width: 640px; }
}
@media (max-width: 420px) {
  .pf-wrap { padding: 18px 12px 32px; }
  .pf-user { padding: 20px 16px; gap: 14px; }
  .pf-avatar { width: 66px; height: 66px; font-size: 1.7rem; }
  .pf-name { font-size: 1.2rem; }
  .pf-tier { padding: 18px 16px; }
  .pf-quick { padding: 0 16px 18px; }
  .pf-sk-wrap { padding: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .pf-sk { animation: none; }
  .pf-bar-fill, .pf-switch, .pf-switch::after { transition: none; }
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

// ແຖວສະວິດ ເປີດ/ປິດ ໂໝດມືດ
function ThemeRow({ isDark, onToggle }) {
  return (
    <button className="pf-row" onClick={onToggle} role="switch" aria-checked={isDark}>
      <Circle>
        <IconMoon />
      </Circle>
      <span className="pf-row-text">
        <span className="pf-row-lb">ໂໝດມືດ</span>
        <span className="pf-row-sub">{isDark ? 'ກຳລັງໃຊ້: ດຳ' : 'ກຳລັງໃຊ້: ຂາວ'}</span>
      </span>
      <span className={`pf-switch${isDark ? ' on' : ''}`} />
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
        <span className="pf-tier-spent">
          ຍອດສະສົມ <b>{fmt(spent)}</b> ກີບ
        </span>
      </div>
      <div className="pf-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="pf-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pf-tier-note">
        {next ? `ຍັງຂາດ ${fmt(next.min - spent)} ກີບ ເພື່ອເປັນ ${next.name}` : 'ທ່ານຢູ່ລະດັບສູງສຸດແລ້ວ'}
      </div>
      <ol className="pf-ladder" aria-hidden="true">
        {TIERS.map((t, i) => (
          <li key={t.name} className={i <= idx ? (i === idx ? 'done now' : 'done') : ''}>
            {t.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProfileInner() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null); // { name, phone }
  const [stats, setStats] = useState(null); // { total, inProgress, delivered, spent }
  const [loyalty, setLoyalty] = useState(null); // { points, coupons }
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState(getSavedTheme); // 'light' | 'dark'

  // ສະລັບທີມ ແລ້ວບັນທຶກໄວ້
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  useEffect(() => {
    (async () => {
      try {
        const [me, ord, loy] = await Promise.all([
          apiGet('/api/customer-auth/me'),
          apiGet('/api/customer/orders'),
          apiGet('/api/coupons/me'),
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
            // ນັບຍອດກ່ອນຫັກຄູປອງ (subtotal) ເພື່ອບໍ່ໃຫ້ການໃຊ້ຄູປອງເຮັດໃຫ້ເລື່ອນລະດັບຊ້າລົງ
            spent: delivered.reduce((sum, o) => sum + (Number(o.subtotal ?? o.total) || 0), 0),
          });
        }
        if (loy.ok) {
          setLoyalty({
            points: Number(loy.data.points) || 0,
            coupons: Array.isArray(loy.data.coupons) ? loy.data.coupons.length : 0,
          });
        }
      } catch (err) {
        console.error(err);
      }
      setLoaded(true);
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
          // ໜ້າດຽວ: ຊື່, ເບີໂທ, ວັນເກີດ, PIN ແລະ ລຶບບັນຊີ
          icon: <PersonCircle />,
          label: 'ຂໍ້ມູນບັນຊີ',
          sub: 'ຊື່, ເບີໂທ, ວັນເກີດ, PIN ແລະ ລຶບບັນຊີ',
          to: '/menu/profile/info',
        },
        {
          icon: (
            <Circle>
              <IconPin />
            </Circle>
          ),
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
  ];

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="pf-wrap">
        <h1 className="pf-title">ບັນຊີຂອງຂ້ອຍ</h1>

        <div className="pf-layout">
          {/* ===== ຊ້າຍ: ໂປຣໄຟລ໌ + ລະດັບ + ແຕ້ມ + ສະຖິຕິ ===== */}
          <div className="pf-side">
            <section className="pf-card">
              <div className="pf-user">
                <span className="pf-avatar">
                  {initial || (
                    <svg {...sv} width="36" height="36" stroke="#fff">
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
                    </svg>
                  )}
                </span>
                <span className="pf-user-info">
                  <span className={`pf-name${name ? '' : ' empty'}`}>{name || 'ຍັງບໍ່ໄດ້ຕັ້ງຊື່'}</span>
                  <span className="pf-phone">{user?.phone || ' '}</span>
                </span>
              </div>

              {!loaded && (
                <div className="pf-sk-wrap" aria-hidden="true">
                  <div className="pf-sk" style={{ height: 26, width: '60%' }} />
                  <div className="pf-sk" style={{ height: 10 }} />
                  <div className="pf-sk" style={{ height: 52 }} />
                </div>
              )}

              {loaded && stats && <TierBlock spent={stats.spent} />}

              {loaded && loyalty && (
                <div className="pf-quick">
                  <button className="pf-q" onClick={() => navigate('/menu/profile/coupons')}>
                    <span className="pf-q-num">{fmt(loyalty.points)}</span>
                    <span className="pf-q-lb">ແຕ້ມສະສົມ</span>
                  </button>
                  <button className="pf-q" onClick={() => navigate('/menu/profile/coupons')}>
                    <span className="pf-q-num">{fmt(loyalty.coupons)}</span>
                    <span className="pf-q-lb">ຄູປອງຂອງຂ້ອຍ</span>
                  </button>
                </div>
              )}

              <div className="pf-stats">
                <button className="pf-stat" onClick={() => navigate(ORDERS_PATH)}>
                  <div className="pf-stat-num">{show(stats?.total)}</div>
                  <div className="pf-stat-lb">ອໍເດີທັງໝົດ</div>
                </button>
                <button className="pf-stat" onClick={() => navigate(ORDERS_PATH)}>
                  <div className="pf-stat-num">{show(stats?.inProgress)}</div>
                  <div className="pf-stat-lb">ກຳລັງດຳເນີນການ</div>
                </button>
                <button className="pf-stat" onClick={() => navigate(ORDERS_PATH)}>
                  <div className="pf-stat-num">{show(stats?.delivered)}</div>
                  <div className="pf-stat-lb">ຮອດແລ້ວ</div>
                </button>
              </div>
            </section>
          </div>

          {/* ===== ຂວາ: ເມນູ ===== */}
          <div className="pf-main">
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

            {/* ການສະແດງຜົນ (ໂໝດມືດ) */}
            <h2 className="pf-sec-title">ການສະແດງຜົນ</h2>
            <section className="pf-card">
              <ThemeRow isDark={theme === 'dark'} onToggle={toggleTheme} />
            </section>

            {/* ອອກຈາກລະບົບ */}
            <button className="pf-logout" onClick={handleLogout}>
              <IconLogout />
              ອອກຈາກລະບົບ
            </button>

            <div className="pf-footer">POLO SHOP v1.0.0</div>
          </div>
        </div>
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