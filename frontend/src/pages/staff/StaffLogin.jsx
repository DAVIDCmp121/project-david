import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, saveToken } from '../../api.js';
import LoginShell, { UserIcon, LockIcon, EyeIcon } from '../../components/LoginShell.jsx';

export default function StaffLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function submit() {
    setError('');
    if (!username || !password) {
      setError('ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ');
      return;
    }
    try {
      const { data } = await apiPost('/api/auth/login', { username, password });
      if (data.success) {
        saveToken(data.token);
        navigate('/admin');
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
      badge="ສຳລັບພະນັກງານ"
      subtitle="ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອເຮັດວຽກ"
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
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <button type="button" className="lg-eye-btn" onClick={() => setShowPassword((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງລະຫັດຜ່ານ">
          <EyeIcon off={showPassword} />
        </button>
      </div>

      <button className="lg-submit" onClick={submit}>ເຂົ້າສູ່ລະບົບ</button>
      <div className="lg-error">{error}</div>
    </LoginShell>
  );
}