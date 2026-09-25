import { useState } from 'react';
import { apiPost, saveToken } from '../../api.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function login() {
    setError('');
    try {
      const { ok, data } = await apiPost('/api/auth/login', { username, password });

      if (ok && data.success) {
        saveToken(data.token); // ✅ ໃໝ່: ເກັບ token ໄວ້ໃນ localStorage
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
      <main className="admin-login-box">
        <div className="lock-icon">🔒</div>
        <h1>ເຂົ້າສູ່ລະບົບແອດມິນ</h1>
        <input type="text" placeholder="ຊື່ຜູ້ໃຊ້" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          type="password"
          placeholder="ລະຫັດຜ່ານ"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') login(); }}
        />
        <button onClick={login}>ເຂົ້າສູ່ລະບົບ</button>
        <p style={{ color: '#7A2039' }}>{error}</p>
      </main>
    </div>
  );
}