import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { apiPost, clearToken } from '../api.js';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();

  async function handleLogout() {
    try {
      await apiPost('/api/customer-auth/logout', {});
    } catch (err) {}
    clearToken();
    navigate('/menu/login');
  }

  const items = [
    {
      key: 'home',
      label: 'ໜ້າແຮກ',
      path: '/menu',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      key: 'orders',
      label: 'ອໍເດີ',
      path: '/menu/orders',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      key: 'logout',
      label: 'ອອກ',
      action: handleLogout,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(14px + env(safe-area-inset-bottom))',
        width: 'calc(100% - 32px)',
        maxWidth: 460,
        display: 'flex',
        gap: 4,
        padding: 6,
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        borderRadius: 28,
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        zIndex: 50,
      }}
    >
      {items.map((item) => {
        const active = item.path && location.pathname === item.path;
        return (
          <button
            key={item.key}
            onClick={() => (item.action ? item.action() : navigate(item.path))}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 4px',
              background: active ? 'rgba(212, 165, 72, 0.16)' : 'transparent',
              border: 'none',
              borderRadius: 22,
              color: active ? '#b8862b' : '#6b7280',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {item.icon}
            {item.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  right: '24%',
                  background: '#e53935',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: 10,
                  fontWeight: 600,
                  minWidth: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                }}
              >
                {item.badge}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 500 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}