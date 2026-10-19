import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../api.js';
import { usePageT } from '../../useT.js';
import couponDict from '../../locales/coupons.js';

const EMPTY = {
  name: '',
  type: 'fixed',
  value: '',
  min_order: '',
  max_discount: '',
  points_cost: '',
  valid_days: '30',
};

const css = `
.ac-wrap { max-width: 900px; }
.ac-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.ac-head h2 { margin: 0; }
.ac-add-btn {
  padding: 10px 18px; border-radius: 8px; border: none; background: #c9a227; color: #fff;
  font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.92rem;
  display: inline-flex; align-items: center; gap: 7px;
}
.ac-add-btn:hover { filter: brightness(0.95); }

.ac-overlay {
  position: fixed; inset: 0; background: rgba(17, 24, 39, 0.5); display: flex;
  align-items: center; justify-content: center; padding: 20px; z-index: 1000;
}
.ac-modal {
  background: #fff; border-radius: 14px; padding: 22px; width: 100%; max-width: 640px;
  max-height: 90vh; overflow-y: auto; box-sizing: border-box;
}
.ac-modal h3 { margin: 0 0 16px; font-size: 1.1rem; }

.ac-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ac-field label { display: block; font-size: 0.82rem; color: #6b7280; margin-bottom: 4px; }
.ac-field input, .ac-field select {
  width: 100%; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 8px;
  font-family: inherit; font-size: 0.95rem; box-sizing: border-box;
}
.ac-actions { display: flex; gap: 10px; margin-top: 18px; }
.ac-btn {
  padding: 9px 18px; border-radius: 8px; border: none; background: #c9a227; color: #fff;
  font-weight: 700; cursor: pointer; font-family: inherit;
}
.ac-btn.ghost { background: #fff; color: #374151; border: 1px solid #d1d5db; }
.ac-btn.small { padding: 6px 12px; font-size: 0.82rem; }
.ac-btn:disabled { opacity: 0.6; cursor: default; }

.ac-item {
  display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e5e7eb;
  border-radius: 12px; padding: 12px 14px; margin-bottom: 10px;
}
.ac-item.off { opacity: 0.55; }
.ac-info { flex: 1; min-width: 0; }
.ac-name { font-weight: 700; }
.ac-sub { font-size: 0.82rem; color: #6b7280; margin-top: 2px; line-height: 1.45; }
.ac-badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
  background: #dcfce7; color: #15803d; margin-left: 8px;
}
.ac-badge.off { background: #f3f4f6; color: #6b7280; }
.ac-empty { color: #6b7280; }
@media (max-width: 560px) { .ac-grid { grid-template-columns: minmax(0, 1fr); } }
`;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

export default function AdminCoupons() {
  const { t } = usePageT(couponDict);
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const kip = t('common.kip');

  function summary(c) {
    const main =
      c.type === 'percent'
        ? c.max_discount
          ? t('ac.discPercentMax', { v: c.value, max: fmt(c.max_discount), kip })
          : t('ac.discPercent', { v: c.value })
        : t('ac.discFixed', { v: fmt(c.value), kip });
    const cond = c.min_order > 0 ? t('ac.minOrder', { v: fmt(c.min_order), kip }) : t('ac.noMin');
    return `${main} · ${cond}`;
  }

  async function load() {
    const r = await apiGet('/api/coupons/admin/list');
    if (r.ok && Array.isArray(r.data.coupons)) setList(r.data.coupons);
  }

  useEffect(() => {
    load();
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      value: String(c.value),
      min_order: String(c.min_order || ''),
      max_discount: c.max_discount ? String(c.max_discount) : '',
      points_cost: String(c.points_cost),
      valid_days: String(c.valid_days),
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save() {
    setSaving(true);
    const body = editingId ? { ...form, active: list.find((c) => c.id === editingId)?.active ?? 1 } : form;
    const r = editingId
      ? await apiPost(`/api/coupons/admin/${editingId}/update`, body)
      : await apiPost('/api/coupons/admin', body);
    setSaving(false);
    if (r.ok) {
      closeModal();
      load();
    } else {
      alert((r.data && r.data.error) || t('ac.errSave'));
    }
  }

  async function toggle(c) {
    const r = await apiPost(`/api/coupons/admin/${c.id}/update`, {
      name: c.name,
      type: c.type,
      value: c.value,
      min_order: c.min_order,
      max_discount: c.max_discount || '',
      points_cost: c.points_cost,
      valid_days: c.valid_days,
      active: c.active ? 0 : 1,
    });
    if (r.ok) load();
    else alert((r.data && r.data.error) || t('ac.errUpdate'));
  }

  return (
    <div className="ac-wrap">
      <style>{css}</style>

      <div className="ac-head">
        <h2>{t('ac.title')}</h2>
        <button className="ac-add-btn" onClick={openAdd}>{t('ac.add')}</button>
      </div>

      {list.length === 0 && <p className="ac-empty">{t('ac.empty')}</p>}
      {list.map((c) => (
        <div className={`ac-item${c.active ? '' : ' off'}`} key={c.id}>
          <div className="ac-info">
            <div className="ac-name">
              {c.name}
              <span className={`ac-badge${c.active ? '' : ' off'}`}>{c.active ? t('ac.on') : t('ac.off')}</span>
            </div>
            <div className="ac-sub">{summary(c)}</div>
            <div className="ac-sub">{t('ac.redeem', { pts: fmt(c.points_cost), days: c.valid_days })}</div>
          </div>
          <button className="ac-btn ghost small" onClick={() => startEdit(c)}>{t('ac.edit')}</button>
          <button className="ac-btn ghost small" onClick={() => toggle(c)}>
            {c.active ? t('ac.btnOff') : t('ac.btnOn')}
          </button>
        </div>
      ))}

      {open && (
        <div className="ac-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="ac-modal">
            <h3>{editingId ? t('ac.titleEdit') : t('ac.titleAdd')}</h3>

            <div className="ac-grid">
              <div className="ac-field">
                <label>{t('ac.fName')}</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="ac-field">
                <label>{t('ac.fType')}</label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="fixed">{t('ac.tFixed')}</option>
                  <option value="percent">{t('ac.tPercent')}</option>
                </select>
              </div>
              <div className="ac-field">
                <label>{form.type === 'percent' ? t('ac.fValuePercent') : t('ac.fValueFixed')}</label>
                <input type="number" min="1" value={form.value} onChange={(e) => set('value', e.target.value)} />
              </div>
              <div className="ac-field">
                <label>{t('ac.fMin')}</label>
                <input type="number" min="0" value={form.min_order} onChange={(e) => set('min_order', e.target.value)} />
              </div>
              {form.type === 'percent' && (
                <div className="ac-field">
                  <label>{t('ac.fMax')}</label>
                  <input type="number" min="0" value={form.max_discount} onChange={(e) => set('max_discount', e.target.value)} />
                </div>
              )}
              <div className="ac-field">
                <label>{t('ac.fPoints')}</label>
                <input type="number" min="1" value={form.points_cost} onChange={(e) => set('points_cost', e.target.value)} />
              </div>
              <div className="ac-field">
                <label>{t('ac.fDays')}</label>
                <input type="number" min="1" value={form.valid_days} onChange={(e) => set('valid_days', e.target.value)} />
              </div>
            </div>

            <div className="ac-actions">
              <button className="ac-btn" onClick={save} disabled={saving}>
                {saving ? t('ac.saving') : editingId ? t('ac.saveEdit') : t('ac.addBtn')}
              </button>
              <button className="ac-btn ghost" onClick={closeModal}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}