import { useState } from 'react';
import { apiPost, saveToken } from '../../api.js';
import LoginShell, { UserIcon, LockIcon, EyeIcon } from '../../components/LoginShell.jsx';
import { usePageT } from '../../useT.js';
import loginDict from '../../locales/login.js';

export default function AdminLogin() {
  const { t } = usePageT(loginDict);
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
        setError(data.error || t('lg.errFail'));
      }
    } catch (err) {
      console.error(err);
      setError(t('lg.errConn'));
    }
  }

  return (
    <LoginShell
      badge={t('lg.badge')}
      subtitle={t('lg.subtitle')}
    >
      <div className="lg-field">
        <span className="lg-field-icon"><UserIcon /></span>
        <input type="text" placeholder={t('lg.username')} value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="lg-field">
        <span className="lg-field-icon"><LockIcon /></span>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('lg.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') login(); }}
        />
        <button type="button" className="lg-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label={t('lg.togglePw')}>
          <EyeIcon off={showPassword} />
        </button>
      </div>

      <button className="lg-submit" onClick={login}>{t('lg.submit')}</button>
      <div className="lg-error">{error}</div>
    </LoginShell>
  );
}