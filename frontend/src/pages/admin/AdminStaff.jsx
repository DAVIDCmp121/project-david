import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiPost, apiPut, getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { usePageT } from '../../useT.js';
import staffDict from '../../locales/staff.js';

const footerStyle = { display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' };

export default function AdminStaff() {
  const { t } = usePageT(staffDict);

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

  // popup ຢືນຢັນລຶບພະນັກງານ
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
        alert(t('st.adminOnly'));
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
      setError(t('st.errFill'));
      return;
    }
    const { data } = await apiPost('/api/staff', { name, username, password });
    if (data.success) {
      closeAddModal();
      loadStaffList();
    } else {
      setError(data.error || t('st.errAdd'));
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
      alert(data.error || t('st.errDel'));
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
      setEditError(t('st.errFill'));
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
      setEditError(data.error || t('st.errEdit'));
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
      setResetError(t('st.errPwLen'));
      return;
    }
    const { data } = await apiPut(`/api/staff/${resetTarget.id}/reset-password`, { password: resetPassword });
    if (data.success) {
      alert(t('st.resetOk'));
      closeReset();
    } else {
      setResetError(data.error || t('st.errReset'));
    }
  }

  if (role !== 'admin') return null;

  return (
    <div>
      <div className="admin-card">
        <button className="primary" onClick={() => setAddOpen(true)}>{t('st.add')}</button>
      </div>

      <table className="admin-table staff-table">
        <thead>
          <tr>
            <th>{t('st.thName')}</th>
            <th>{t('st.thUser')}</th>
            <th>{t('st.thRole')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.username}</td>
              <td>
                <span className={`role-badge role-${s.role}`}>
                  {s.role === 'admin' ? t('role.admin') : t('role.staff')}
                </span>
              </td>
              <td>
                <button onClick={() => openEdit(s)}>{t('st.edit')}</button>
                <button onClick={() => openReset(s)}>{t('st.resetPw')}</button>
                {s.role === 'staff' ? (
                  <button className="del-btn" onClick={() => deleteStaffMember(s.id, s.name)}>{t('st.del')}</button>
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
            <h3 style={{ color: 'var(--navy)' }}>{t('st.addTitle')}</h3>
            <input placeholder={t('st.phName')} value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder={t('st.phUserLogin')} value={username} onChange={(e) => setUsername(e.target.value)} />
            <input placeholder={t('st.phPw')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>
            <div style={footerStyle}>
              <button onClick={closeAddModal}>{t('common.cancel')}</button>
              <button className="primary" onClick={addStaff}>{t('st.addBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={closeEdit}>✕</button>
            <h3 style={{ color: 'var(--navy)' }}>{t('st.editTitle')}</h3>
            <input placeholder={t('st.phName')} value={editName} onChange={(e) => setEditName(e.target.value)} />
            <input placeholder={t('st.phUser')} value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: '100%', padding: 8, margin: '6px 0' }}>
              <option value="staff">{t('role.staff')}</option>
              <option value="admin">{t('role.admin')}</option>
            </select>
            <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{editError}</div>
            <div style={footerStyle}>
              <button onClick={closeEdit}>{t('common.cancel')}</button>
              <button className="primary" onClick={saveEdit}>{t('st.save')}</button>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeReset(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={closeReset}>✕</button>
            <h3 style={{ color: 'var(--navy)' }}>{t('st.resetTitle', { name: resetTarget?.name || '' })}</h3>
            <input placeholder={t('st.phNewPw')} type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
            <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{resetError}</div>
            <div style={footerStyle}>
              <button onClick={closeReset}>{t('common.cancel')}</button>
              <button className="primary" onClick={saveReset}>{t('st.resetBtn')}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        message={deleteTarget ? t('st.confirmDel', { name: deleteTarget.name }) : ''}
        danger
        onConfirm={confirmDeleteStaff}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}