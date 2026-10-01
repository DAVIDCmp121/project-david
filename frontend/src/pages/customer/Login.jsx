import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, saveToken } from '../../api.js';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider } from '../../context/CartContext.jsx';

const authCss = `
.rl-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #F8F3E9; padding: 32px 16px 130px;
}
.rl-card {
  width: 100%; max-width: 420px; background: #FBF8F1; border-radius: 20px;
  padding: 36px 28px 30px; box-shadow: 0 8px 30px rgba(20,33,61,0.08);
  text-align: center;
}
.rl-logo-icon { width: 54px; height: 54px; margin: 0 auto 14px; color: var(--navy, #14213D); }
.rl-title { font-family: Georgia, 'Times New Roman', serif; font-size: 2rem; font-weight: 700; color: var(--navy, #14213D); margin: 0; letter-spacing: 1px; }
.rl-title-sub { font-size: 0.78rem; letter-spacing: 4px; color: var(--navy, #14213D); margin: 2px 0 18px; opacity: 0.85; }
.rl-subtitle { color: #8a8372; font-size: 0.92rem; margin: 0 0 24px; }
.rl-tabs { display: flex; gap: 6px; background: #EFE9DA; border-radius: 999px; padding: 4px; margin-bottom: 20px; }
.rl-tab {
  flex: 1; border: none; background: none; padding: 9px 0; border-radius: 999px;
  font-size: 0.88rem; font-weight: 600; color: #8a8372; cursor: pointer; transition: all 0.2s;
}
.rl-tab.active { background: #fff; color: var(--navy, #14213D); box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
.rl-field { position: relative; margin-bottom: 14px; }
.rl-field input {
  width: 100%; box-sizing: border-box; padding: 14px 44px; border-radius: 12px;
  border: 1px solid #E5DFCF; background: #fff; font-size: 0.95rem; color: var(--navy, #14213D); margin: 0;
}
.rl-field input:focus { outline: none; border-color: var(--gold, #b8862b); }
.rl-field-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #a79f8c; display: flex;
}
.rl-eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: #a79f8c; padding: 4px; display: flex;
}
.rl-submit {
  width: 100%; margin-top: 6px; padding: 14px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #D4A548, #B8862B); color: #fff; font-weight: 700;
  font-size: 0.98rem; cursor: pointer; box-shadow: 0 6px 16px rgba(184,134,43,0.35);
}
.rl-forgot { margin: 16px 0 0; color: var(--gold, #b8862b); font-size: 0.88rem; font-weight: 600; cursor: pointer; text-decoration: underline; }
.rl-error { color: #c0392b; font-size: 0.85rem; min-height: 18px; margin-top: 10px; }
.rl-success { color: #2e7d32; font-size: 0.85rem; margin-top: 6px; }
.rl-switch-card {
  width: 100%; max-width: 420px; background: #fff; border: 1px solid #ECE6D6; border-radius: 16px;
  padding: 16px; margin-top: 14px; text-align: center; color: #8a8372; font-size: 0.88rem;
}
.rl-switch-card button {
  background: none; border: none; color: var(--gold, #b8862b); font-weight: 700; cursor: pointer; margin-left: 6px; font-size: 0.88rem;
}
`;

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function EyeIcon({ off }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function PoloLogo() {
  return (
    <svg className="rl-logo-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 6l8 6" />
      <path d="M38 12l-3 3" />
      <path d="M16 40c-4-3-6-8-5-13 1-6 5-9 8-13 1-2 1-4 0-6" />
      <path d="M19 8c4 2 6 6 5 10-1 5-5 8-7 12-2 3-2 6-1 9" />
      <circle cx="30" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CustomerLoginInner() {
  const [tab, setTab] = useState('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [regBirthDate, setRegBirthDate] = useState('');
  const [authError, setAuthError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpPhone, setFpPhone] = useState('');
  const [fpBirthDate, setFpBirthDate] = useState('');
  const [fpNewPin, setFpNewPin] = useState('');
  const [fpNewPinConfirm, setFpNewPinConfirm] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { ok } = await apiGet('/api/customer-auth/me');
      if (ok) navigate('/menu', { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitLogin() {
    setAuthError('');
    if (!loginPhone || !loginPin) {
      setAuthError('ກະລຸນາປ້ອນເບີໂທ ແລະ PIN');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/login', { phone: loginPhone, pin: loginPin });
    if (data.success) {
      saveToken(data.token);
      navigate('/menu');
    } else {
      setAuthError(data.error || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ');
    }
  }

  async function submitRegister() {
    setAuthError('');
    if (!regPhone || !regPin || !regBirthDate) {
      setAuthError('ກະລຸນາປ້ອນເບີໂທ, PIN ແລະ ວັນເດືອນປີເກີດ');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/register', {
      phone: regPhone, pin: regPin, name: regName, birth_date: regBirthDate,
    });
    if (data.success) {
      saveToken(data.token);
      navigate('/menu');
    } else {
      setAuthError(data.error || 'ສະໝັກສະມາຊິກບໍ່ສຳເລັດ');
    }
  }

  async function submitForgotPin() {
    setFpError('');
    setFpSuccess('');
    if (!fpPhone || !fpBirthDate || !fpNewPin || !fpNewPinConfirm) {
      setFpError('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ');
      return;
    }
    if (fpNewPin !== fpNewPinConfirm) {
      setFpError('PIN ໃໝ່ ແລະ ຢືນຢັນ PIN ບໍ່ຕົງກັນ');
      return;
    }
    const res = await fetch('/api/customer-auth/forgot-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fpPhone, birth_date: fpBirthDate, new_pin: fpNewPin }),
    });
    const data = await res.json();
    if (data.success) {
      setFpSuccess(data.message || 'ຕັ້ງ PIN ໃໝ່ສຳເລັດ');
      setTimeout(() => {
        setForgotOpen(false);
        setLoginPhone(fpPhone);
      }, 1500);
    } else {
      setFpError(data.error || 'ຣີເຊັດ PIN ບໍ່ສຳເລັດ');
    }
  }

  return (
    <div className="customer-shell">
      <style>{authCss}</style>
      <div className="rl-wrap">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="rl-card">
            <PoloLogo />
            <h1 className="rl-title">POLO SHOP</h1>
            <div className="rl-title-sub">RALPH LAUREN</div>
            <p className="rl-subtitle">
              {tab === 'login' ? 'ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອເຂົ້າໜ້າຮ້ານ' : 'ສະໝັກສະມາຊິກໃໝ່ເພື່ອເລີ່ມຊື້ເຄື່ອງ'}
            </p>

            {tab === 'login' && (
              <>
                <div className="rl-field">
                  <span className="rl-field-icon"><PhoneIcon /></span>
                  <input type="tel" placeholder="ເບີໂທລະສັບ" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} />
                </div>
                <div className="rl-field">
                  <span className="rl-field-icon"><LockIcon /></span>
                  <input
                    type={showLoginPin ? 'text' : 'password'}
                    placeholder="ລະຫັດ PIN"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
                  />
                  <button type="button" className="rl-eye-btn" onClick={() => setShowLoginPin((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງ PIN">
                    <EyeIcon off={showLoginPin} />
                  </button>
                </div>
                <button className="rl-submit" onClick={submitLogin}>ເຂົ້າສູ່ລະບົບ</button>
                <p className="rl-forgot" onClick={() => setForgotOpen(true)}>ລືມ PIN?</p>
              </>
            )}

            {tab === 'register' && (
              <>
                <div className="rl-field">
                  <span className="rl-field-icon"><UserIcon /></span>
                  <input type="text" placeholder="ຊື່ (ບໍ່ບັງຄັບ)" value={regName} onChange={(e) => setRegName(e.target.value)} />
                </div>
                <div className="rl-field">
                  <span className="rl-field-icon"><PhoneIcon /></span>
                  <input type="tel" placeholder="ເບີໂທລະສັບ" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                </div>
                <div className="rl-field">
                  <span className="rl-field-icon"><LockIcon /></span>
                  <input
                    type={showRegPin ? 'text' : 'password'}
                    placeholder="ຕັ້ງລະຫັດ PIN (4-6 ໂຕເລກ)"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                  />
                  <button type="button" className="rl-eye-btn" onClick={() => setShowRegPin((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງ PIN">
                    <EyeIcon off={showRegPin} />
                  </button>
                </div>
                <div className="rl-field">
                  <span className="rl-field-icon"><CalendarIcon /></span>
                  <input type="text" placeholder="ວັນເດືອນປີເກີດ (ໃຊ້ຢືນຢັນຕົວຕົນ)" value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} />
                </div>
                <button className="rl-submit" onClick={submitRegister}>ສະໝັກສະມາຊິກ</button>
              </>
            )}

            <div className="rl-error">{authError}</div>
          </div>

          <div className="rl-switch-card">
            {tab === 'login' ? (
              <>ຍັງບໍ່ມີບັນຊີ? <button onClick={() => { setTab('register'); setAuthError(''); }}>ສ້າງບັນຊີໃໝ່</button></>
            ) : (
              <>ມີບັນຊີແລ້ວ? <button onClick={() => { setTab('login'); setAuthError(''); }}>ເຂົ້າສູ່ລະບົບ</button></>
            )}
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setForgotOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" onClick={() => setForgotOpen(false)}>✕</button>
            <h2>ຣີເຊັດລະຫັດ PIN</h2>
            <p>ກະລຸນາປ້ອນເບີໂທ ແລະ ວັນເດືອນປີເກີດທີ່ໃຊ້ຕອນສະໝັກ ເພື່ອຕັ້ງ PIN ໃໝ່</p>
            <input type="tel" placeholder="ເບີໂທລະສັບ" value={fpPhone} onChange={(e) => setFpPhone(e.target.value)} />
            <input type="text" placeholder="ວັນເດືອນປີເກີດ" value={fpBirthDate} onChange={(e) => setFpBirthDate(e.target.value)} />
            <input type="password" placeholder="ຕັ້ງ PIN ໃໝ່ (4-6 ໂຕເລກ)" value={fpNewPin} onChange={(e) => setFpNewPin(e.target.value)} />
            <input type="password" placeholder="ຢືນຢັນ PIN ໃໝ່" value={fpNewPinConfirm} onChange={(e) => setFpNewPinConfirm(e.target.value)} />
            <button className="auth-submit" onClick={submitForgotPin}>ຕັ້ງ PIN ໃໝ່</button>
            <div className="auth-error">{fpError}</div>
            <div className="auth-success">{fpSuccess}</div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function CustomerLogin() {
  return (
    <CartProvider>
      <CustomerLoginInner />
    </CartProvider>
  );
}