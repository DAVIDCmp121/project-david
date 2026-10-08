import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../api.js';

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
.ac-wrap h2 { margin: 0 0 16px; }
.ac-box {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 20px;
}
.ac-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ac-field label { display: block; font-size: 0.82rem; color: #6b7280; margin-bottom: 4px; }
.ac-field input, .ac-field select {
  width: 100%; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 8px;
  font-family: inherit; font-size: 0.95rem; box-sizing: border-box;
}
.ac-actions { display: flex; gap: 10px; margin-top: 14px; }
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
@media (max-width: 560px) { .ac-grid { grid-template-columns: minmax(0, 1fr); } }
`;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function summary(c) {
  const main =
    c.type === 'percent'
      ? `ຫຼຸດ ${c.value}%${c.max_discount ? ` (ສູງສຸດ ${fmt(c.max_discount)} ກີບ)` : ''}`
      : `ຫຼຸດ ${fmt(c.value)} ກີບ`;
  const cond = c.min_order > 0 ? `ຂັ້ນຕ່ຳ ${fmt(c.min_order)} ກີບ` : 'ບໍ່ມີຂັ້ນຕ່ຳ';
  return `${main} · ${cond}`;
}

export default function AdminCoupons() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    window.scrollTo(0, 0);
  }

  function cancelEdit() {
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
      cancelEdit();
      load();
    } else {
      alert((r.data && r.data.error) || 'ບັນທຶກບໍ່ສຳເລັດ');
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
    else alert((r.data && r.data.error) || 'ອັບເດດບໍ່ສຳເລັດ');
  }

  return (
    <div className="ac-wrap">
      <style>{css}</style>
      <h2>ຄູປອງສ່ວນຫຼຸດ (ລູກຄ້າແລກດ້ວຍແຕ້ມ)</h2>

      <div className="ac-box">
        <div className="ac-grid">
          <div className="ac-field">
            <label>ຊື່ຄູປອງ</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="ac-field">
            <label>ປະເພດ</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="fixed">ຫຼຸດເປັນຈຳນວນເງິນ (ກີບ)</option>
              <option value="percent">ຫຼຸດເປັນເປີເຊັນ (%)</option>
            </select>
          </div>
          <div className="ac-field">
            <label>{form.type === 'percent' ? 'ເປີເຊັນທີ່ຫຼຸດ (1-100)' : 'ຈຳນວນເງິນທີ່ຫຼຸດ (ກີບ)'}</label>
            <input type="number" min="1" value={form.value} onChange={(e) => set('value', e.target.value)} />
          </div>
          <div className="ac-field">
            <label>ຍອດສັ່ງຊື້ຂັ້ນຕ່ຳ (ກີບ)</label>
            <input type="number" min="0" value={form.min_order} onChange={(e) => set('min_order', e.target.value)} />
          </div>
          {form.type === 'percent' && (
            <div className="ac-field">
              <label>ຫຼຸດສູງສຸດ (ກີບ, ເວັ້ນວ່າງ = ບໍ່ຈຳກັດ)</label>
              <input type="number" min="0" value={form.max_discount} onChange={(e) => set('max_discount', e.target.value)} />
            </div>
          )}
          <div className="ac-field">
            <label>ແຕ້ມທີ່ໃຊ້ແລກ</label>
            <input type="number" min="1" value={form.points_cost} onChange={(e) => set('points_cost', e.target.value)} />
          </div>
          <div className="ac-field">
            <label>ອາຍຸຄູປອງຫຼັງແລກ (ວັນ)</label>
            <input type="number" min="1" value={form.valid_days} onChange={(e) => set('valid_days', e.target.value)} />
          </div>
        </div>
        <div className="ac-actions">
          <button className="ac-btn" onClick={save} disabled={saving}>
            {saving ? 'ກຳລັງບັນທຶກ...' : editingId ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມຄູປອງ'}
          </button>
          {editingId && (
            <button className="ac-btn ghost" onClick={cancelEdit}>ຍົກເລີກ</button>
          )}
        </div>
      </div>

      {list.length === 0 && <p style={{ color: '#6b7280' }}>ຍັງບໍ່ມີຄູປອງ</p>}
      {list.map((c) => (
        <div className={`ac-item${c.active ? '' : ' off'}`} key={c.id}>
          <div className="ac-info">
            <div className="ac-name">
              {c.name}
              <span className={`ac-badge${c.active ? '' : ' off'}`}>{c.active ? 'ເປີດໃຊ້' : 'ປິດ'}</span>
            </div>
            <div className="ac-sub">{summary(c)}</div>
            <div className="ac-sub">ແລກດ້ວຍ {fmt(c.points_cost)} ແຕ້ມ · ອາຍຸ {c.valid_days} ວັນ</div>
          </div>
          <button className="ac-btn ghost small" onClick={() => startEdit(c)}>ແກ້ໄຂ</button>
          <button className="ac-btn ghost small" onClick={() => toggle(c)}>
            {c.active ? 'ປິດ' : 'ເປີດ'}
          </button>
        </div>
      ))}
    </div>
  );
}