import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { apiPost } from '../api.js';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useCart();

  async function handleLogout() {
    try {
      await apiPost('/api/customer-auth/logout', {});
    } catch (err) {}
    navigate('/menu/login');
  }

  const items = [
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
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        background: '#1e1e1e',
        borderTop: '1px solid #333',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
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
              gap: 2,
              padding: '8px 4px',
              background: 'none',
              border: 'none',
              color: active ? '#d4a548' : '#ccc',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {item.icon}
            {item.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: '28%',
                  background: '#e53935',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: 10,
                  minWidth: 15,
                  height: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {item.badge}
              </span>
            )}
            <span style={{ fontSize: 11 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}