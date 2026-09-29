import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost } from '../../api';

const MAX_NAME = 30;

function ProfileInfoInner() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await apiGet('/api/customer-auth/me');
      if (res.ok) {
        setPhone(res.data.phone || '');
        setName(res.data.name || '');
      } else {
        setMessage({ type: 'error', text: 'ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ' });
    }
    setLoading(false);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage({ type: 'error', text: 'ກະລຸນາປ້ອນຊື່' });
      return;
    }
    if (trimmed.length > MAX_NAME) {
      setMessage({ type: 'error', text: `ຊື່ຍາວເກີນໄປ (ສູງສຸດ ${MAX_NAME} ໂຕອັກສອນ)` });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiPost('/api/customer-auth/me/name', { name: trimmed });
      if (res.ok) {
        setName(trimmed);
        setMessage({ type: 'ok', text: 'ບັນທຶກຊື່ສຳເລັດ' });
      } else {
        setMessage({ type: 'error', text: (res.data && res.data.error) || 'ບັນທຶກບໍ່ສຳເລັດ' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'ບັນທຶກບໍ່ສຳເລັດ' });
    }
    setSaving(false);
  }

  return (
    <div className="customer-shell">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 130px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/menu/profile')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 30,
              lineHeight: 1,
              padding: '0 8px 4px 0',
              cursor: 'pointer',
              color: 'var(--cust-text)',
            }}
          >
            ‹
          </button>
          <h1 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--cust-text)' }}>ຂໍ້ມູນສ່ວນຕົວ</h1>
        </div>

        {loading ? (
          <p style={{ color: 'var(--cust-text-muted)' }}>ກຳລັງໂຫລດ...</p>
        ) : (
          <section
            style={{
              background: 'var(--cust-card)',
              border: '1px solid var(--cust-border)',
              borderRadius: 14,
              padding: '16px 18px',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', marginBottom: 4 }}>ເບີໂທ</div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--cust-text)', marginBottom: 18 }}>
              {phone}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', marginBottom: 6 }}>ຊື່</div>
            <input
              type="text"
              value={name}
              maxLength={MAX_NAME}
              placeholder="ຍັງບໍ່ໄດ້ຕັ້ງຊື່"
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid var(--cust-border)',
                fontSize: '1rem',
              }}
            />

            {message && (
              <p style={{ marginTop: 10, color: message.type === 'ok' ? '#16a34a' : '#dc2626' }}>
                {message.text}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '13px 10px',
                borderRadius: 10,
                border: 'none',
                background: '#111',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
            </button>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function ProfileInfo() {
  return (
    <CartProvider>
      <ProfileInfoInner />
    </CartProvider>
  );
}