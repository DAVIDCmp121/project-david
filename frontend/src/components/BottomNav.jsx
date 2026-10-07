import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

/* ---------- CSS (ໂໝດສະຫວ່າງ + ໂໝດມືດ) ---------- */
const css = `
.bn {
  position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(14px + env(safe-area-inset-bottom));
  width: calc(100% - 32px); max-width: 460px;
  display: flex; gap: 4px; padding: 6px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 28px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 50;
  transition: background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}
.bn-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 8px 4px; background: transparent; border: none; border-radius: 22px;
  color: #6b7280; cursor: pointer; position: relative;
  transition: background 0.25s, color 0.25s, transform 0.15s, box-shadow 0.25s;
}
.bn-item:active { transform: scale(0.94); }
.bn-item.active { background: rgba(212, 165, 72, 0.16); color: #b8862b; }
.bn-lb { font-size: 11px; font-weight: 500; }
.bn-item.active .bn-lb { font-weight: 600; }
.bn-badge {
  position: absolute; top: 3px; right: 24%;
  background: #e53935; color: #fff; border-radius: 999px;
  font-size: 10px; font-weight: 600; min-width: 16px; height: 16px;
  display: flex; align-items: center; justify-content: center; padding: 0 4px;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
}

/* ===== ໂໝດມືດ ===== */
:root[data-theme='dark'] .bn {
  background: rgba(25, 25, 29, 0.78);
  border: 1px solid rgba(201, 162, 39, 0.25);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(201, 162, 39, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
:root[data-theme='dark'] .bn-item { color: #9a9aa3; }
:root[data-theme='dark'] .bn-item:hover { color: #e8c25a; }
:root[data-theme='dark'] .bn-item.active {
  background: linear-gradient(160deg, rgba(201, 162, 39, 0.3), rgba(201, 162, 39, 0.1));
  color: #f0d77a;
  box-shadow: 0 0 16px rgba(201, 162, 39, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
:root[data-theme='dark'] .bn-item.active svg {
  filter: drop-shadow(0 0 6px rgba(232, 194, 90, 0.7));
}
:root[data-theme='dark'] .bn-badge { box-shadow: 0 0 0 2px #19191d; }
`;

const svgProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();

  const items = [
    {
      key: 'home',
      label: 'ໜ້າຫຼັກ',
      path: '/menu',
      icon: (
        <svg {...svgProps}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      key: 'cart',
      label: 'ກະຕ່າ',
      path: '/menu/cart',
      badge: cartCount > 0 ? cartCount : null,
      icon: (
        <svg {...svgProps}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
    {
      key: 'chat',
      label: 'ແຊັດ',
      path: '/menu/chat',
      icon: (
        <svg {...svgProps}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      key: 'orders',
      label: 'ອໍເດີ',
      path: '/menu/orders',
      icon: (
        <svg {...svgProps}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bn">
      <style>{css}</style>
      {items.map((item) => {
        const active = item.path && location.pathname === item.path;
        return (
          <button
            key={item.key}
            className={`bn-item${active ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.badge && <span className="bn-badge">{item.badge}</span>}
            <span className="bn-lb">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}