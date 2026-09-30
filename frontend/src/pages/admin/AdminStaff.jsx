import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiPost, apiPut, getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';

const footerStyle = { display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' };

export default function AdminStaff() {
  const [role, setRole] = useState(null);
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editError, setEditError] = useState('');

  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');

  // popup ຢືນຢັນລບພະນັກງານ
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      const r = data.role || 'admin';
      setRole(r);
      if (r !== 'admin') {
        alert('ໜ້ານີ້ສະເພາະແອດມນເທົ່ານັນ');
        navigate('/admin');
        return;
      }
      loadStaffList();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStaffList() {
    const res = await fetch('/api/staff', {
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    setStaff(data.staff || []);
  }

  function closeAddModal() {
    setAddOpen(false);
    setName(''); setUsername(''); setPassword(''); setError('');
  }

  async function addStaff() {
    setError('');
    if (!name || !username || !password) {
      setError('ກະລນາປ້ອນຂໍມູນໃຫ້ຄົບ');
      return;
    }
    const { data } = await apiPost('/api/staff', { name, username, password });
    if (data.success) {
      closeAddModal();
      loadStaffList();
    } else {
      setError(data.error || 'ເພີ່ມພະນັກງານບໍ່ສເລັດ');
    }
  }

  function deleteStaffMember(id, memberName) {
    setDeleteTarget({ id, name: memberName });
  }

  async function confirmDeleteStaff() {
    const { id } = deleteTarget;
    setDeleteTarget(null);
    const { data } = await apiDelete(`/api/staff/${id}`);
    if (data.success) {
      loadStaffList();
    } else {
      alert(data.error || 'ລບບສຳເລັດ');
    }
  }

  function openEdit(s) {
    setEditTarget(s);
    setEditName(s.name);
    setEditUsername(s.username);
    setEditRole(s.role);
    setEditError('');
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditTarget(null);
  }

  async function saveEdit() {
    setEditError('');
    if (!editName || !editUsername) {
      setEditError('ກະລຸນາປ້ອນຂໍມູນໃຫ້ຄົບ');
      return;
    }
    const { data } = await apiPut(`/api/staff/${editTarget.id}`, {
      name: editName,
      username: editUsername,
      role: editRole,
    });
    if (data.success) {
      closeEdit();
      loadStaffList();
    } else {
      setEditError(data.error || 'ແກ້ໄຂບໍສຳເລດ');
    }
  }

  function openReset(s) {
    setResetTarget(s);
    setResetPassword('');
    setResetError('');
    setResetOpen(true);
  }

  function closeReset() {
    setResetOpen(false);
    setResetTarget(null);
  }

  async function saveReset() {
    setResetError('');
    if (!resetPassword || resetPassword.length < 4) {
      setResetError('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 4 ໂຕອັກສອນ');
      return;
    }
    const { data } = await apiPut(`/api/staff/${resetTarget.id}/reset-password`, { password: resetPassword });
    if (data.success) {
      alert('ຣີເຊັດລະຫັດຜານສຳເລດ ✅');
      closeReset();
    } else {
      setResetError(data.error || 'ຣີເຊັດບໍ່ສເລັດ');
    }
  }

  if (role !== 'admin') return null;

  return (
    <div>
      <div className="admin-card">
        <button className="primary" onClick={() => setAddOpen(true)}>➕ ເພີ່ມພະນັກງານ</button>
      </div>

      <table className="admin-table staff-table">
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
                <button onClick={() => openEdit(s)}>ແກ້ໄຂ</button>
                <button onClick={() => openReset(s)}>ຣີເຊັດລະຫັດ</button>
                {s.role === 'staff' ? (
                  <button className="del-btn" onClick={() => deleteStaffMember(s.id, s.name)}>ລຶບ</button>
                ) : (
                  <span className="btn-placeholder" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {addOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={closeAddModal}>✕</button>
            <h3 style={{ color: 'var(--navy)' }}>ເພີ່ມພະນັກງານໃໝ່</h3>
            <input placeholder="ຊື່ພະນັກງານ" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="ຊື່ຜູ້ໃຊ້ (ໃຊ້ login)" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input placeholder="ລະຫັດຜ່ານ" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>
            <div style={footerStyle}>
              <button onClick={closeAddModal}>ຍົກເລີກ</button>
              <button className="primary" onClick={addStaff}>ເພີ່ມພະນັກງານ</button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={closeEdit}>✕</button>
            <h3 style={{ color: 'var(--navy)' }}>ແກ້ໄຂຂໍ້ມູນພະນັກງານ</h3>
            <input placeholder="ຊື່ພະນັກງານ" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <input placeholder="ຊື່ຜູ້ໃຊ້" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: '100%', padding: 8, margin: '6px 0' }}>
              <option value="staff">ພະນັກງານ</option>
              <option value="admin">ແອດມິນ</option>
            </select>
            <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{editError}</div>
            <div style={footerStyle}>
              <button onClick={closeEdit}>ຍົກເລີກ</button>
              <button className="primary" onClick={saveEdit}>ບັນທຶກ</button>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeReset(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={closeReset}>✕</button>
            <h3 style={{ color: 'var(--navy)' }}>ຣີເຊັດລະຫັດຜ່ານ: {resetTarget?.name}</h3>
            <input placeholder="ລະຫັດຜ່ານໃໝ່" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{resetError}</div>
            <div style={footerStyle}>
              <button onClick={closeReset}>ຍົກເລີກ</button>
              <button className="primary" onClick={saveReset}>ຣີເຊັດ</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        message={deleteTarget ? `ຢືນຢັນລົບພະນັກງານ "${deleteTarget.name}" ອອກຈາກລະບົບ?` : ''}
        danger
        onConfirm={confirmDeleteStaff}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}