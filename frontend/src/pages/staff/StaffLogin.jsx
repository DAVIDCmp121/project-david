import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, saveToken } from '../../api.js';
import LoginShell, { UserIcon, LockIcon, EyeIcon } from '../../components/LoginShell.jsx';
import { usePageT } from '../../useT.js';
import dict from '../../locales/login.js';

export default function StaffLogin() {
  const { t } = usePageT(dict);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit() {
    setError('');
    if (!username || !password) {
      setError(t('lg.errEmpty'));
      return;
    }
    try {
      const { data } = await apiPost('/api/auth/login', { username, password });
      if (data.success) {
        saveToken(data.token);
        navigate('/admin');
      } else {
        setError(t('lg.errFail'));
      }
    } catch (err) {
      console.error(err);
      setError(t('lg.errConn'));
    }
  }

  return (
    <LoginShell
      badge={t('lg.staffBadge')}
      subtitle={t('lg.staffSubtitle')}
    >
      <div className="lg-field">
        <span className="lg-field-icon"><UserIcon /></span>
        <input
          type="text"
          placeholder={t('lg.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="lg-field">
        <span className="lg-field-icon"><LockIcon /></span>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('lg.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <button
          type="button"
          className="lg-eye-btn"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={t('lg.togglePw')}
        >
          <EyeIcon off={showPassword} />
        </button>
      </div>

      <button className="lg-submit" onClick={submit}>{t('lg.submit')}</button>
      <div className="lg-error">{error}</div>
    </LoginShell>
  );
}