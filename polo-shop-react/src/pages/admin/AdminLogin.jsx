import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../../api.js';

// ⚠️ ໝາຍເຫດ: ໄຟລ໌ public/admin/login.html ຕົ້ນສະບັບ ບໍ່ເຄີຍຖືກສົ່ງມາໃຫ້ເບິ່ງ
// Component ນີ້ອີງໃສ່ຮູບແບບດຽວກັນກັບ staff/login.html (Username+Password) — ກະລຸນາກວດສອບ

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit() {
    setError('');
    if (!username || !password) {
      setError('ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ');
      return;
    }
    const { data } = await apiPost('/api/auth/login', { username, password });
    if (data.success) {
      navigate('/admin');
    } else {
      setError(data.error || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ');
    }
  }

  return (
    <div className="plain-login-shell">
      <div className="plain-login-box">
        <h1>ແອດມິນ POLO SHOP</h1>
        <input type="text" placeholder="ຊື່ຜູ້ໃຊ້" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          type="password"
          placeholder="ລະຫັດຜ່ານ"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <button onClick={submit}>ເຂົ້າສູ່ລະບົບ</button>
        <div className="auth-error">{error}</div>
      </div>
    </div>
  );
}
