import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost } from '../../api';

const MAX_NAME = 30;

const css = `
.pi-input {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px;
  border: 1px solid #e5e7eb; background: #fff; font-size: 1rem; color: #1f2937;
}
.pi-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212, 165, 72, 0.15); }
.pi-save {
  margin-top: 16px; width: 100%; padding: 13px 10px; border-radius: 12px; border: none;
  background: var(--gold); color: #fff; font-weight: 700; font-size: 0.98rem; cursor: pointer;
  box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.pi-save:hover:not(:disabled) { filter: brightness(1.06); }
.pi-save:disabled { opacity: 0.6; cursor: default; }
`;

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
      <style>{css}</style>
      <TopBar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 24px' }}>
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
              background: '#fff',
              border: '1px solid var(--cust-border)',
              borderRadius: 16,
              padding: '18px 18px 20px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', marginBottom: 4 }}>ເບີໂທ</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--cust-text)', marginBottom: 18 }}>
              {phone}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)', marginBottom: 6 }}>ຊື່</div>
            <input
              className="pi-input"
              type="text"
              value={name}
              maxLength={MAX_NAME}
              placeholder="ຍັງບໍ່ໄດ້ຕັ້ງຊື່"
              onChange={(e) => setName(e.target.value)}
            />

            {message && (
              <p style={{ marginTop: 10, color: message.type === 'ok' ? '#16a34a' : '#dc2626' }}>
                {message.text}
              </p>
            )}

            <button className="pi-save" onClick={handleSave} disabled={saving}>
              {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
            </button>
          </section>
        )}
      </div>
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