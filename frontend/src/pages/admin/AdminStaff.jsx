import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiPost } from '../../api.js';

// ➕ ນຳຈາກ public/admin/staff.html

export default function AdminStaff() {
  const [role, setRole] = useState(null);
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      const r = data.role || 'admin';
      setRole(r);
      if (r !== 'admin') {
        alert('ໜ້ານີ້ສະເພາະແອດມິນເທົ່ານັນ');
        navigate('/admin');
        return;
      }
      loadStaffList();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStaffList() {
    const res = await fetch('/api/staff', { credentials: 'include' });
    const data = await res.json();
    setStaff(data.staff || []);
  }

  async function addStaff() {
    setError('');
    if (!name || !username || !password) {
      setError('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ');
      return;
    }
    const { data } = await apiPost('/api/staff', { name, username, password });
    if (data.success) {
      setName(''); setUsername(''); setPassword('');
      loadStaffList();
    } else {
      setError(data.error || 'ເພິ່ມພະນັກງານບໍ່ສຳເລັດ');
    }
  }

  async function deleteStaffMember(id, memberName) {
    if (!window.confirm(`ຢນຢັນລຶບພະນັກງານ "${memberName}" ອອກຈາກລະບົບ?`)) return;
    const { data } = await apiDelete(`/api/staff/${id}`);
    if (data.success) {
      loadStaffList();
    } else {
      alert(data.error || 'ລຶບບໍ່ສຳເລັດ');
    }
  }

  if (role !== 'admin') return null;

  return (
    <div>
      <div className="admin-card">
        <h3>ເພີ່ມພະນັກງານໃໝ່</h3>
        <input placeholder="ຊື່ພະນັກງານ" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="ຊື່ຜູ້ໃຊ້ (ໃຊ້ login)" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="ລະຫັດຜ່ານ" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>
        <button className="primary" onClick={addStaff}>ເພີ່ມພະນັກງານ</button>
      </div>

      <table className="admin-table">
        <thead>
          <tr><th>ຊື່</th><th>ຊື່ຜູ້ໃຊ້</th><th>ສິດ</th><th></th></tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.username}</td>
              <td><span className={`role-badge role-${s.role}`}>{s.role === 'admin' ? 'ແອດມິນ' : 'ພະນັກງານ'}</span></td>
              <td>
                {s.role === 'staff' && (
                  <button className="del-btn" onClick={() => deleteStaffMember(s.id, s.name)}>ລຶບ</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
