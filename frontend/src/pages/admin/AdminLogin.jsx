import { useState } from 'react';
import { apiPost, saveToken } from '../../api.js';

const authCss = `
.rl-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: #F8F3E9; padding: 32px 16px;
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
.rl-error { color: #c0392b; font-size: 0.85rem; min-height: 18px; margin-top: 10px; }
`;

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function login() {
    setError('');
    try {
      const { ok, data } = await apiPost('/api/auth/login', { username, password });

      if (ok && data.success) {
        saveToken(data.token);
        window.location.href = '/admin';
      } else {
        setError(data.error || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ');
      }
    } catch (err) {
      console.error(err);
      setError('ເຊື່ອມຕໍ່ບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
    }
  }

  return (
    <div className="admin-login-shell">
      <style>{authCss}</style>
      <div className="rl-wrap">
        <div className="rl-card">
          <PoloLogo />
          <h1 className="rl-title">POLO SHOP</h1>
          <div className="rl-title-sub">RALPH LAUREN</div>
          <p className="rl-subtitle">ເຂົ້າສູ່ລະບົບສຳລັບແອັດມິນ/ພະນັກງານ</p>

          <div className="rl-field">
            <span className="rl-field-icon"><UserIcon /></span>
            <input type="text" placeholder="ຊື່ຜູ້ໃຊ້" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="rl-field">
            <span className="rl-field-icon"><LockIcon /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="ລະຫັດຜ່ານ"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') login(); }}
            />
            <button type="button" className="rl-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງລະຫັດຜ່ານ">
              <EyeIcon off={showPassword} />
            </button>
          </div>

          <button className="rl-submit" onClick={login}>ເຂົ້າສູ່ລະບົບ</button>
          <div className="rl-error">{error}</div>
        </div>
      </div>
    </div>
  );
}