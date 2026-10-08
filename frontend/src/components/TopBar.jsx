import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import CustomerHeader from './CustomerHeader.jsx';
import logoImg from '../assets/polo-logo.jpeg';

const css = `
.tb {
  position: sticky; top: 0; z-index: 60; background: #fff;
  border-bottom: 1px solid var(--cust-border, #eee);
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  padding: calc(8px + env(safe-area-inset-top)) 16px 8px;
}
.tb-inner {
  max-width: 1100px; margin: 0 auto; display: grid; align-items: center;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas: "brand search nav profile";
  column-gap: 14px; row-gap: 8px;
}
.tb-brand { grid-area: brand; display: flex; align-items: center; gap: 8px; cursor: pointer; min-width: 0; }
.tb-brand h1 {
  margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: 0.5px;
  color: var(--gold); white-space: nowrap;
}
/* โลโก้: พื้นขาวหาย เหลือตัวม้าสีเดียวกับชื่อร้าน */
.tb-logo {
  position: relative; width: 26px; height: 42px; flex: 0 0 auto;
  overflow: hidden; background: var(--gold); isolation: isolate;
}
.tb-logo img {
  position: absolute; left: 50%; top: 50%; height: 56px; width: auto; max-width: none;
  transform: translate(-50%, -50%); mix-blend-mode: lighten; filter: contrast(1.25);
}
.tb-search { grid-area: search; position: relative; min-width: 0; }
.tb-search input {
  width: 100%; box-sizing: border-box; padding: 9px 38px; border-radius: 999px;
  border: 1px solid #e5e7eb; background: #f9fafb; color: #1f2937; font-size: 15px; outline: none;
}
.tb-search input:focus { border-color: var(--gold); background: #fff; }
.tb-search .ic { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.tb-clear {
  position: absolute; right: 7px; top: 50%; transform: translateY(-50%);
  width: 24px; height: 24px; border-radius: 50%; border: none; padding: 0;
  background: #e5e7eb; color: #6b7280; cursor: pointer; font-size: 13px; line-height: 1;
}
.tb-nav { grid-area: nav; display: flex; gap: 4px; }
.tb-profile { grid-area: profile; display: flex; justify-content: flex-end; }
.tb-btn {
  position: relative; width: 58px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 2px; border: none; border-radius: 12px; background: transparent;
  color: #6b7280; cursor: pointer; transition: background .2s, color .2s;
}
.tb-btn span.lb { font-size: 11px; font-weight: 500; white-space: nowrap; }
.tb-btn.active { background: rgba(212,165,72,0.16); color: #b8862b; }
.tb-btn.active span.lb { font-weight: 700; }
.tb-badge {
  position: absolute; top: 1px; right: 10px; min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 999px; background: #e53935; color: #fff; font-size: 10px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #fff;
}
@media (max-width: 700px) {
  .tb { padding-left: 12px; padding-right: 12px; }
  .tb-inner {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "brand profile" "search search" "nav nav";
  }
  .tb-inner.nosearch { grid-template-areas: "brand profile" "nav nav"; }
  .tb-nav { display: grid; grid-template-columns: repeat(4, 1fr); }
  .tb-btn { width: auto; padding: 4px 2px; }
  .tb-badge { right: calc(50% - 20px); }
}
`;

const svg = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export default function TopBar({ search, onSearch }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  const hasSearch = typeof onSearch === 'function';

  const items = [
    { key: 'home', label: 'ໜ້າຫຼັກ', path: '/menu', icon: (
      <svg {...svg}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
    ) },
    { key: 'cart', label: 'ກະຕ່າ', path: '/menu/cart', badge: cartCount > 0 ? cartCount : null, icon: (
      <svg {...svg}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
    ) },
    { key: 'chat', label: 'ແຊັດ', path: '/menu/chat', icon: (
      <svg {...svg}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
    ) },
    { key: 'orders', label: 'ອໍເດີ', path: '/menu/orders', icon: (
      <svg {...svg}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    ) },
  ];

  return (
    <header className="tb">
      <style>{css}</style>
      <div className={`tb-inner${hasSearch ? '' : ' nosearch'}`}>
        <div className="tb-brand" onClick={() => navigate('/menu')}>
          <span className="tb-logo"><img src={logoImg} alt="" /></span>
          <h1>POLO SHOP</h1>
        </div>

        {hasSearch && (
          <div className="tb-search">
            <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search || ''}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="ຄົ້ນຫາສິນຄ້າ..."
            />
            {search && <button className="tb-clear" aria-label="ລ້າງ" onClick={() => onSearch('')}>✕</button>}
          </div>
        )}

        <nav className="tb-nav">
          {items.map((it) => (
            <button
              key={it.key}
              className={`tb-btn${pathname === it.path ? ' active' : ''}`}
              onClick={() => navigate(it.path)}
            >
              {it.icon}
              {it.badge && <span className="tb-badge">{it.badge}</span>}
              <span className="lb">{it.label}</span>
            </button>
          ))}
        </nav>

        <div className="tb-profile"><CustomerHeader /></div>
      </div>
    </header>
  );
}