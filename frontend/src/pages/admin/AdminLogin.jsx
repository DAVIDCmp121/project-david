import { useState } from 'react';
import { apiPost, saveToken } from '../../api.js';
import LoginShell, { UserIcon, LockIcon, EyeIcon } from '../../components/LoginShell.jsx';

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
    <LoginShell
      badge="ສຳລັບແອດມິນ"
      subtitle="ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອຈັດການຮ້ານ"
    >
      <div className="lg-field">
        <span className="lg-field-icon"><UserIcon /></span>
        <input type="text" placeholder="ຊື່ຜູ້ໃຊ້" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="lg-field">
        <span className="lg-field-icon"><LockIcon /></span>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="ລະຫັດຜ່ານ"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') login(); }}
        />
        <button type="button" className="lg-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງລະຫັດຜ່ານ">
          <EyeIcon off={showPassword} />
        </button>
      </div>

      <button className="lg-submit" onClick={login}>ເຂົ້າສູ່ລະບົບ</button>
      <div className="lg-error">{error}</div>
    </LoginShell>
  );
}