import { useState } from 'react';

// ➕ ນຳມາຈາກ public/admin/login.html ຕົ້ນສະບັບ (ໄຟລ໌ຈິງ — ໄດ້ຮັບແລ້ວ)
// ພຶດຕິກຳຈິງ: ເຊັກແຄ່ res.ok (ບໍ່ແມ່ນ data.success), redirect ດ້ວຍ window.location ໂດຍກົງ

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function login() {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (res.ok) {
      window.location.href = '/admin';
    } else {
      setError(data.error);
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