import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { PersonCircle, HeartCircle, Chevron } from '../../components/SettingsIcons.jsx';
import { apiPost, clearToken } from '../../api';

function Row({ icon, label, onClick, last }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: last ? 'none' : '1px solid var(--cust-border)',
        borderRadius: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {icon}
      <span style={{ flex: 1, fontSize: '1rem', color: 'var(--cust-text)' }}>{label}</span>
      <Chevron />
    </button>
  );
}

function ProfileInner() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiPost('/api/customer-auth/logout', {});
    } catch (err) {}
    clearToken();
    navigate('/menu/login');
  }

  return (
    <div className="customer-shell">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 130px' }}>
        <h1 style={{ fontSize: '1.3rem', marginBottom: 16, color: 'var(--cust-text)' }}>ບັນຊີຂອງຂ້ອຍ</h1>

        <section
          style={{
            background: 'var(--cust-card)',
            border: '1px solid var(--cust-border)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <Row
            icon={<PersonCircle />}
            label="ຂໍ້ມູນສ່ວນຕົວ"
            onClick={() => navigate('/menu/profile/info')}
          />
          <Row
            icon={<HeartCircle />}
            label="ສິນຄ້າທີ່ຖືກໃຈ"
            onClick={() => navigate('/menu/favorites')}
            last
          />
        </section>

        <button
          onClick={handleLogout}
          style={{
            marginTop: 32,
            width: '100%',
            padding: '13px 10px',
            borderRadius: 10,
            border: '1px solid #dc2626',
            background: '#fff',
            color: '#dc2626',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          ອອກຈາກລະບົບ
        </button>
      </div>

      <BottomNav />
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