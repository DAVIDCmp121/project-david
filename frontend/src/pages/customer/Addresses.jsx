import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-addresses.js';

const MAX_ADDRESSES = 5;
const BASE = '/api/customer-account/addresses';

const css = `
.ad-wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 32px; }
.ad-head { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
.ad-back {
  background: none; border: none; font-size: 30px; line-height: 1; padding: 0 8px 4px 0;
  cursor: pointer; color: var(--cust-text);
}
.ad-title { font-size: 1.3rem; margin: 0; color: var(--cust-text); }

.ad-card {
  background: #fff; border: 1px solid var(--cust-border); border-radius: 16px;
  padding: 16px 18px; margin-bottom: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.ad-card.is-default { border-color: var(--gold); background: #fffdf6; }
.ad-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ad-label { font-weight: 700; color: var(--cust-text); }
.ad-badge {
  padding: 2px 10px; border-radius: 999px; background: #faf0cf; color: #9a7412;
  font-size: 0.72rem; font-weight: 700;
}
.ad-text { color: var(--cust-text); font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.ad-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.ad-btn {
  padding: 6px 14px; border-radius: 999px; border: 1px solid var(--cust-border); background: #fff;
  color: var(--cust-text); font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
}
.ad-btn:hover { border-color: var(--gold); color: #b8862b; }
.ad-btn.danger { color: #dc2626; border-color: #fca5a5; }
.ad-btn.danger:hover { background: #dc2626; border-color: #dc2626; color: #fff; }

.ad-input {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; margin-bottom: 10px;
  border: 1px solid #e5e7eb; background: #fff; font-size: 1rem; color: #1f2937; font-family: inherit;
}
.ad-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212, 165, 72, 0.15); }
.ad-lb { font-size: 0.85rem; color: var(--cust-text-muted); margin-bottom: 4px; }
.ad-row { display: flex; gap: 10px; }
.ad-row button { flex: 1; }
.ad-save {
  padding: 12px 10px; border-radius: 12px; border: none; background: var(--gold); color: #fff;
  font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit;
}
.ad-save:disabled { opacity: 0.6; cursor: default; }
.ad-cancel {
  padding: 12px 10px; border-radius: 12px; border: 1px solid var(--cust-border); background: #fff;
  color: var(--cust-text); font-weight: 600; font-size: 0.95rem; cursor: pointer; font-family: inherit;
}
.ad-add {
  width: 100%; padding: 13px 10px; border-radius: 14px; border: 1.5px dashed #d8c68a;
  background: #fffdf6; color: #b8862b; font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit;
}
.ad-add:hover { background: #fffaf0; border-color: var(--gold); }
.ad-empty { text-align: center; color: var(--cust-text-muted); padding: 24px 0; }
.ad-limit { text-align: center; color: var(--cust-text-muted); font-size: 0.85rem; }
`;

function AddressesInner() {
  const navigate = useNavigate();
  const { t } = usePageT(dict);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState({ label: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [delId, setDelId] = useState(null); // ที่อยู่ที่รอยืนยันการลบ

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const res = await apiGet(BASE);
      if (res.status === 401) {
        navigate('/menu/login');
        return;
      }
      if (res.ok) setList(res.data.addresses || []);
      else setMessage({ type: 'error', text: t('ad.loadFail') });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: t('ad.loadFail') });
    }
    setLoading(false);
  }

  function startNew() {
    setForm({ label: '', address: '' });
    setEditing('new');
    setMessage(null);
  }

  function startEdit(a) {
    setForm({ label: a.label || '', address: a.address || '' });
    setEditing(a.id);
    setMessage(null);
    window.scrollTo(0, 0);
  }

  function cancel() {
    setEditing(null);
    setMessage(null);
  }

  async function save() {
    const address = form.address.trim();
    if (!address) {
      setMessage({ type: 'error', text: t('ad.errAddr') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const body = { label: form.label.trim(), address };
      const res = editing === 'new' ? await apiPost(BASE, body) : await apiPut(`${BASE}/${editing}`, body);
      if (res.ok) {
        setEditing(null);
        await load();
      } else {
        setMessage({ type: 'error', text: (res.data && res.data.error) || t('ad.errSave') });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: t('ad.errSave') });
    }
    setSaving(false);
  }

  // กดปุ่มลบ → เปิดกล่องยืนยัน
  function askRemove(id) {
    setDelId(id);
  }

  async function doRemove() {
    const id = delId;
    setDelId(null);
    try {
      const res = await apiDelete(`${BASE}/${id}`);
      if (res.ok) await load();
      else setMessage({ type: 'error', text: (res.data && res.data.error) || t('ad.errDel') });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: t('ad.errDel') });
    }
  }

  async function makeDefault(id) {
    try {
      const res = await apiPost(`${BASE}/${id}/default`, {});
      if (res.ok) await load();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="ad-wrap">
        <div className="ad-head">
          <button className="ad-back" onClick={() => navigate('/menu/profile')} aria-label={t('common.back')}>
            ‹
          </button>
          <h1 className="ad-title">{t('ad.title')}</h1>
        </div>

        {message && (
          <p style={{ color: message.type === 'ok' ? '#16a34a' : '#dc2626', margin: '0 0 12px' }}>
            {message.text}
          </p>
        )}

        {editing !== null && (
          <section className="ad-card">
            <div className="ad-lb">{t('ad.labelName')}</div>
            <input
              className="ad-input"
              type="text"
              maxLength={50}
              placeholder={t('ad.labelPh')}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <div className="ad-lb">{t('ad.address')}</div>
            <textarea
              className="ad-input"
              rows={3}
              maxLength={500}
              placeholder={t('ad.addressPh')}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="ad-row">
              <button className="ad-cancel" onClick={cancel}>{t('common.cancel')}</button>
              <button className="ad-save" onClick={save} disabled={saving}>
                {saving ? t('ad.saving') : t('ad.save')}
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <p style={{ color: 'var(--cust-text-muted)' }}>{t('common.loading')}</p>
        ) : (
          <>
            {list.length === 0 && editing === null && (
              <div className="ad-empty">{t('ad.empty')}</div>
            )}

            {list.map((a) => (
              <section key={a.id} className={`ad-card${a.is_default ? ' is-default' : ''}`}>
                <div className="ad-top">
                  <span className="ad-label">{a.label || t('ad.address')}</span>
                  {a.is_default ? <span className="ad-badge">{t('ad.default')}</span> : null}
                </div>
                <div className="ad-text">{a.address}</div>
                <div className="ad-actions">
                  {!a.is_default && (
                    <button className="ad-btn" onClick={() => makeDefault(a.id)}>
                      {t('ad.setDefault')}
                    </button>
                  )}
                  <button className="ad-btn" onClick={() => startEdit(a)}>{t('ad.edit')}</button>
                  <button className="ad-btn danger" onClick={() => askRemove(a.id)}>{t('ad.delete')}</button>
                </div>
              </section>
            ))}

            {editing === null &&
              (list.length < MAX_ADDRESSES ? (
                <button className="ad-add" onClick={startNew}>{t('ad.add')}</button>
              ) : (
                <div className="ad-limit">{t('ad.limit', { n: MAX_ADDRESSES })}</div>
              ))}
          </>
        )}
      </div>

      <ConfirmModal
        open={delId !== null}
        message={t('ad.delConfirm')}
        danger
        onConfirm={doRemove}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}

export default function Addresses() {
  return (
    <CartProvider>
      <AddressesInner />
    </CartProvider>
  );
}