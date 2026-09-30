import { useEffect, useRef, useState } from 'react';
import { getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';

const MAX_IMAGES = 6;
const NEW_CATEGORY = '__new__';
const emptyForm = { name: '', price: '', size: '', color: '', stock: '', description: '' };

const primaryBtnStyle = {
  background: 'var(--blue)', color: '#fff', border: 'none',
  padding: '10px 16px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer',
};
const plainBtnStyle = {
  background: '#fff', color: '#374151', border: '1px solid #dfe3e8',
  padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
};
const smallArrowStyle = {
  border: '1px solid #dfe3e8', background: '#fff', borderRadius: 4,
  width: 36, height: 22, fontSize: 11, cursor: 'pointer', padding: 0,
};
const selectStyle = {
  width: '100%', padding: 10, marginBottom: 10, borderRadius: 6,
  border: '1px solid #E5E0D8', background: '#F5F5F3', color: '#2B2620',
  fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit',
};

// ---------- ຟອມເພີມ / ແກໄຂສນຄ້າ (popup) ----------
function ProductFormModal({ mode, productId, categories, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState(emptyForm);
  const [categoryChoice, setCategoryChoice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [images, setImages] = useState([]);
  const [sizeRows, setSizeRows] = useState([]);
  const [promoActive, setPromoActive] = useState(false);
  const [promoPercent, setPromoPercent] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [bsMode, setBsMode] = useState('auto');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const keyRef = useRef(0);
  const imagesRef = useRef([]);
  imagesRef.current = images;

  function nextKey() {
    keyRef.current += 1;
    return keyRef.current;
  }

  useEffect(() => {
    if (!isEdit) return undefined;
    (async () => {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const p = await res.json();
        setForm({
          name: p.name || '',
          price: p.price ?? '',
          size: p.size || '',
          color: p.color || '',
          stock: p.stock ?? '',
          description: p.description || '',
        });
        setCategoryChoice(p.category || '');
        setPromoActive(!!p.promo_active);
        setPromoPrice(p.promo_price ?? '');
        setPromoStart(p.promo_start || '');
        setPromoEnd(p.promo_end || '');
        setBsMode(p.bestseller_mode || 'auto');
        setImages((p.images || []).map((url) => ({ key: nextKey(), url })));
        setSizeRows(
          Array.isArray(p.size_chart)
            ? p.size_chart.map((r) => ({ size: r.size || '', chest: r.chest || '', length: r.length || '' }))
            : []
        );
      } catch (e) {
        setError('ໂຫລດຂໍມູນສິນຄ້າບໍສຳເລດ');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    };
  }, []);

  function handlePickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (picked.length === 0) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      alert(`ອັບໂຫລດໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ`);
      return;
    }
    if (picked.length > slots) {
      alert(`ເພີ່ມໄດ້ອີກ ${slots} ຮູບ ລະບົບຈະໃຊ້ ${slots} ຮູບທອິດ`);
    }
    const added = picked.slice(0, slots).map((file) => ({
      key: nextKey(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...added]);
  }

  function removeImage(key) {
    setImages((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target && target.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((i) => i.key !== key);
    });
  }

  function moveImage(index, dir) {
    setImages((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function addSizeRow() {
    setSizeRows((prev) => [...prev, { size: '', chest: '', length: '' }]);
  }
  function updateSizeRow(i, field, value) {
    setSizeRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function removeSizeRow(i) {
    setSizeRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function resolveCategory() {
    if (categoryChoice !== NEW_CATEGORY) return categoryChoice;
    const typed = newCategory.trim();
    const same = categories.find((c) => c.toLowerCase() === typed.toLowerCase());
    return same || typed;
  }

  // ✅ ໃໝ່: ໃສ່ % ແລ້ວຄິດໄລລາຄາໂປຣໃຫ້ ອັດຕະໂນມັດ (ຍັງແກ້ລາຄາເອງທີຫງໄດ້)
  function handlePercentChange(v) {
    setPromoPercent(v);
    const pct = Number(v);
    const base = Number(form.price);
    if (pct > 0 && pct < 100 && base > 0) {
      setPromoPrice(String(Math.round(base * (1 - pct / 100))));
    }
  }

  function validateAndSave() {
    setError('');
    if (!form.name || !form.price) {
      setError('ກະລຸນາໃສ່ຊື່ສິນຄ້າ ແລະ ລາຄາ');
      return;
    }
    if (categoryChoice === NEW_CATEGORY && !newCategory.trim()) {
      setError('ກະລຸນາໃສ່ຊືໝວດໃໝ');
      return;
    }
    if (promoActive) {
      const pp = Number(promoPrice);
      if (!pp || pp <= 0) {
        setError('ກະລຸນາໃສ່ລາຄາໂປຣ');
        return;
      }
      if (pp >= Number(form.price)) {
        setError('ລາຄາໂປຣຕ້ອງຕ່ຳກວ່າລາຄາປົກກະຕິ');
        return;
      }
      if (promoStart && promoEnd && promoStart > promoEnd) {
        setError('ວັນເລີ່ມໂປຣຕ້ອງມາກ່ອນວັນສິ້ນສຸດ');
        return;
      }
    }
    if (isEdit) setConfirmOpen(true);
    else submit();
  }

  async function submit() {
    setSaving(true);
    setError('');

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('price', form.price);
    fd.append('size', form.size);
    fd.append('color', form.color);
    fd.append('stock', form.stock === '' ? 0 : form.stock);
    fd.append('description', form.description);
    fd.append('category', resolveCategory());
    fd.append('size_chart', JSON.stringify(sizeRows));
    fd.append('promo_active', promoActive ? '1' : '0');
    fd.append('promo_price', promoPrice === '' ? '' : promoPrice);
    fd.append('promo_start', promoStart);
    fd.append('promo_end', promoEnd);
    fd.append('bestseller_mode', bsMode);
    fd.append('image_order', JSON.stringify(images.map((i) => (i.file ? '__new__' : i.url))));
    images.filter((i) => i.file).forEach((i) => fd.append('images', i.file));

    try {
      const res = await fetch(isEdit ? `/api/products/${productId}` : '/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      if (res.ok) {
        onSaved();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || (isEdit ? 'ອັບເດດສິນຄາບໍ່ສເລັດ' : 'ເພີມສິນຄາບໍ່ສຳເລັດ'));
    } catch (e) {
      setError('ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້');
    }
    setSaving(false);
    setConfirmOpen(false);
  }

  const textareaStyle = {
    width: '100%', padding: 10, marginBottom: 10, borderRadius: 6,
    border: '1px solid #dfe3e8', boxSizing: 'border-box',
    fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical',
  };

  const categoryOptions = [...categories];
  if (categoryChoice && categoryChoice !== NEW_CATEGORY && !categoryOptions.includes(categoryChoice)) {
    categoryOptions.push(categoryChoice);
  }

  return (
    <>
      <div className="modal-overlay">
        <div
          className="modal-box"
          style={{ background: '#fff', color: '#1f2937', width: 520, maxWidth: '94%', maxHeight: '88vh', overflowY: 'auto', textAlign: 'left' }}
        >
          <button className="modal-close" style={{ color: '#1f2937' }} onClick={onClose}>✕</button>
          <h2 style={{ color: 'var(--navy)', textAlign: 'center' }}>{isEdit ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່'}</h2>

          {loading ? (
            <p style={{ textAlign: 'center' }}>ກຳລັງໂຫລດ...</p>
          ) : (
            <>
              <input placeholder="ຊື່ສິນຄ້າ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

              <div style={{ fontWeight: 600, margin: '6px 0' }}>ໝວດສິນຄ້າ</div>
              <select
                value={categoryChoice}
                onChange={(e) => setCategoryChoice(e.target.value)}
                style={selectStyle}
              >
                <option value="">— ບໍ່ມີໝວດ —</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={NEW_CATEGORY}>＋ ສ້າງໝວດໃໝ່...</option>
              </select>
              {categoryChoice === NEW_CATEGORY && (
                <input
                  placeholder="ຊື່ໝວດໃໝ່ (ເຊັ່ນ ກະເປົາ, ເສື້ອ, ໂສ້ງ)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  maxLength={100}
                />
              )}

              <input placeholder="ລາຄາ" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <input placeholder="ໄຊສ໌ (ເຊັ່ນ M\L\XL)" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
              <input placeholder="ສີ" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <input placeholder="ຈຳນວນສະຕັອກ" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />

              <div style={{ fontWeight: 600, margin: '6px 0' }}>
                ຮູບສິນຄ້າ ({images.length}/{MAX_IMAGES}) — ຮູບທຳອິດຄືຮູບໜ້າປົກ
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                {images.map((img, idx) => (
                  <div key={img.key} style={{ position: 'relative', width: 84 }}>
                    <img
                      src={img.preview || img.url}
                      alt=""
                      style={{
                        width: 84, height: 84, objectFit: 'cover', borderRadius: 8, display: 'block',
                        border: idx === 0 ? '2px solid var(--gold)' : '1px solid #dfe3e8',
                      }}
                    />
                    {idx === 0 && (
                      <span style={{ position: 'absolute', left: 4, top: 4, background: 'var(--gold)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8 }}>
                        ປົກ
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(img.key)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, lineHeight: 1, cursor: 'pointer', padding: 0 }}
                    >
                      ✕
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <button type="button" style={smallArrowStyle} disabled={idx === 0} onClick={() => moveImage(idx, -1)}>◀️</button>
                      <button type="button" style={smallArrowStyle} disabled={idx === images.length - 1} onClick={() => moveImage(idx, 1)}>▶️</button>
                    </div>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileRef.current && fileRef.current.click()}
                    style={{ width: 84, height: 84, borderRadius: 8, border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontSize: 26, cursor: 'pointer' }}
                  >
                    ＋
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePickFiles} style={{ display: 'none' }} />

              <div style={{ fontWeight: 600, margin: '6px 0' }}>ລາຍລະອຽດສິນຄ້າ</div>
              <textarea
                rows={4}
                placeholder="ເຊັ່ນ ເນື້ອຜ້າ, ຂໍ້ແນະນຳການດູແລ, ຈຸດເດັ່ນຂອງສິນຄ້າ..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={textareaStyle}
              />

              <div style={{ fontWeight: 600, margin: '6px 0' }}>ຕາຕະລາງຂະໜາດ (ອົກ / ຍາວ ຫົວໜ່ວຍ cm)</div>
              {sizeRows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', gap: 6, marginBottom: 6 }}>
                  <input style={{ margin: 0 }} placeholder="ໄຊສ໌" value={r.size} onChange={(e) => updateSizeRow(i, 'size', e.target.value)} />
                  <input style={{ margin: 0 }} placeholder="ອົກ" value={r.chest} onChange={(e) => updateSizeRow(i, 'chest', e.target.value)} />
                  <input style={{ margin: 0 }} placeholder="ຍາວ" value={r.length} onChange={(e) => updateSizeRow(i, 'length', e.target.value)} />
                  <button
                    type="button"
                    onClick={() => removeSizeRow(i)}
                    style={{ border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: 6, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSizeRow} style={{ ...plainBtnStyle, padding: '6px 12px', marginBottom: 10 }}>
                + ເພີ່ມແຖວຂະໜາດ
              </button>

              {/* ---------- ໂປຣໂມຊັນ ---------- */}
              <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={promoActive}
                    onChange={(e) => setPromoActive(e.target.checked)}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  ຈັດໂປຣໂມຊັນສິນຄ້ານີ
                </label>
                {promoActive && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 2px' }}>ສ່ວນຫຼຸດ %</div>
                        <input
                          placeholder="ເຊັ່ນ 70"
                          type="number"
                          min="1"
                          max="99"
                          value={promoPercent}
                          onChange={(e) => handlePercentChange(e.target.value)}
                          style={{ margin: 0 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 2px' }}>ລາຄາໂປຣ (ກີບ)</div>
                        <input
                          placeholder="ລາຄາໂປຣ"
                          type="number"
                          value={promoPrice}
                          onChange={(e) => setPromoPrice(e.target.value)}
                          style={{ margin: 0 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 2px' }}>
                          ວັນເລີ່ມໂປຣ (ເວັ້ນວ່າງ = ເລີ່ມທັນທີ)
                        </div>
                        <input type="date" value={promoStart} onChange={(e) => setPromoStart(e.target.value)} style={{ margin: 0 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 2px' }}>
                          ວັນສິ້ນສຸດໂປຣ (ເວັ້ນວ່າງ = ບໍ່ມີກຳນົດ)
                        </div>
                        <input type="date" value={promoEnd} onChange={(e) => setPromoEnd(e.target.value)} style={{ margin: 0 }} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ---------- ປ້າຍສິນຄ້າຂາຍດີ ---------- */}
              <div style={{ fontWeight: 600, margin: '6px 0' }}>ປ້າຍສິນຄ້າຂາຍດີ</div>
              <select value={bsMode} onChange={(e) => setBsMode(e.target.value)} style={selectStyle}>
                <option value="auto">ອັດຕະໂນມັດ (ຕາມຍອດຂາຍ)</option>
                <option value="on">ສະແດງປ້າຍສະເໝີ</option>
                <option value="off">ບໍ່ສະແດງປ້າຍ</option>
              </select>

              <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={onClose} style={{ ...plainBtnStyle, flex: 1 }}>ຍົກເລີກ</button>
                <button disabled={saving} onClick={validateAndSave} style={{ ...primaryBtnStyle, flex: 1 }}>
                  {saving ? '...' : (isEdit ? 'ບັນທຶກ' : 'ເພີ່ມສິນຄ້າ')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 340, textAlign: 'center' }}>
            <p style={{ fontSize: '1.05rem', marginBottom: 20, color: '#1f2937' }}>ຢືນຢັນບັນທຶກການແກ້ໄຂສິນຄ້ານີ້?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmOpen(false)} style={plainBtnStyle}>ຍົກເລີກ</button>
              <button disabled={saving} onClick={submit} style={primaryBtnStyle}>ບັນທຶກ</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- ໜ້າຈັດການສິນຄ້າ ----------
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [formModal, setFormModal] = useState(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrStatus, setQrStatus] = useState('ກລງກວດສອບ...');
  const qrFileRef = useRef(null);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ✅ ໃໝ່: threshold ຢູໃນ popup ແທນທີຈະໂຊວຄ້າງໄວ້
  const [threshold, setThreshold] = useState('10');
  const [bestsellerModalOpen, setBestsellerModalOpen] = useState(false);

  const categories = Array.from(
    new Set(products.map((p) => (p.category || '').trim()).filter(Boolean))
  );

  async function loadProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  }

  async function loadCurrentQr() {
    const res = await fetch('/api/settings/payment-qr');
    const data = await res.json();
    if (data.qrImage) {
      setQrImage(data.qrImage);
      setQrStatus('QR ປັດຈບັນ:');
    } else {
      setQrStatus('ຍງບໍ່ໄດ້ອັບໂຫລດ QR');
    }
  }

  async function loadThreshold() {
    try {
      const r = await fetch('/api/products/bestseller-threshold');
      const d = await r.json();
      setThreshold(String(d.threshold));
    } catch (e) {
      // ປອຍເປັນຄ່າເລີ່ມຕນ
    }
  }

  async function saveThreshold() {
    try {
      const res = await fetch('/api/products/bestseller-threshold', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ threshold: Number(threshold) }),
      });
      if (res.ok) {
        alert('ບັນທຶກສຳເລັດ ✅');
        setBestsellerModalOpen(false);
        loadProducts();
      } else {
        alert('ບນທຶກບສຳເລັດ');
      }
    } catch (e) {
      alert('ບນທຶກບສຳເລັດ');
    }
  }

  useEffect(() => {
    loadProducts();
    loadCurrentQr();
    loadThreshold();
  }, []);

  function deleteProduct(id) {
    setDeleteTarget(id);
  }

  async function confirmDeleteProduct() {
    const id = deleteTarget;
    setDeleteTarget(null);
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    loadProducts();
  }

  async function uploadQr() {
    const file = qrFileRef.current?.files[0];
    if (!file) {
      alert('ກະລຸນາເລືອກຮູບ QR ກ່ອນ');
      return;
    }
    const formData = new FormData();
    formData.append('qrImage', file);

    const res = await fetch('/api/settings/payment-qr', {
      method: 'POST',
      credentials: 'include',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    if (res.ok) {
      alert('ອັບໂຫລດ QR ສເລັດ ✅');
      qrFileRef.current.value = '';
      loadCurrentQr();
    } else {
      alert('ອບໂຫລດບໍ່ສເລັດ');
    }
  }

  function handleDragStart(index) {
    dragItem.current = index;
    setDragging(true);
  }
  function handleDragEnter(index) {
    dragOverItem.current = index;
  }
  async function handleDragEnd() {
    setDragging(false);
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    if (from === null || to === null || from === to) return;

    const reordered = [...products];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setProducts(reordered);

    try {
      await fetch('/api/products/reorder', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ids: reordered.map((p) => p.id) }),
      });
    } catch (e) {
      loadProducts();
    }
  }

  return (
    <div>
      <div className="admin-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="primary" onClick={() => setQrOpen(true)}>⚙️ QR ຊັບເງິນ</button>
        <button className="primary" onClick={() => setFormModal({ mode: 'add' })}>➕ ເພີ່ມສິນຄ້າ</button>
        <button className="primary" onClick={() => setBestsellerModalOpen(true)}>🔥 ສິນຄ້າຂາຍດີ</button>
      </div>

      <div className="admin-card">
        {products.length === 0 && <p>ຍັງບໍ່ມີສິນຄ້າ</p>}
        {products.length > 0 && (
          <>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 6 }}>
              ລາກທີ່ໄອຄອນ ⠿ ເພື່ອສະຫຼັບລຳດັບການສະແດງສິນຄ້າ
            </p>
            <table className="admin-table">
              <thead>
                <tr><th></th><th>ຮູບ</th><th>ຊື່</th><th>ໝວດ</th><th>ລາຄາ</th><th>ໄຊສ໌</th><th>ສີ</th><th>ສະຕັອກ</th><th>ຂາຍແລ້ວ</th><th></th></tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    style={{ opacity: dragging && dragItem.current === idx ? 0.4 : 1, cursor: 'grab' }}
                  >
                    <td style={{ color: '#9ca3af', fontSize: 18, textAlign: 'center' }}>⠿</td>
                    <td>{p.image ? <img src={p.image} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 6 }} alt="" /> : '-'}</td>
                    <td>{p.name}</td>
                    <td>{p.category || '-'}</td>
                    <td>
                      {p.is_promo ? (
                        <>
                          <s style={{ color: '#9ca3af' }}>{p.price}</s>{' '}
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{p.final_price}</span>
                        </>
                      ) : (
                        p.price
                      )}{' '}ກີບ
                    </td>
                    <td>{p.size}</td>
                    <td>{p.color}</td>
                    <td>{p.stock}</td>
                    <td>{p.sold_count} {p.is_bestseller && '🔥'}</td>
                    <td>
                      <button onClick={() => setFormModal({ mode: 'edit', id: p.id })}>ແກ້ໄຂ</button>
                      <button className="del-btn" onClick={() => deleteProduct(p.id)}>ລຶບ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {formModal && (
        <ProductFormModal
          key={formModal.mode + (formModal.id || '')}
          mode={formModal.mode}
          productId={formModal.id}
          categories={categories}
          onClose={() => setFormModal(null)}
          onSaved={() => {
            setFormModal(null);
            loadProducts();
          }}
        />
      )}

      {qrOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setQrOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setQrOpen(false)}>✕</button>
            <h2 style={{ color: 'var(--navy)' }}>ຮູບ QR ຊັບເງິນຮ້ານ</h2>
            {qrImage && <img src={qrImage} alt="QR" style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />}
            <p style={{ color: '#6b7280' }}>{qrStatus}</p>
            <input type="file" accept="image/*" ref={qrFileRef} />
            <button style={{ ...primaryBtnStyle, marginTop: 10 }} onClick={uploadQr}>ອັບໂຫລດ QR</button>
          </div>
        </div>
      )}

      {bestsellerModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBestsellerModalOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 380 }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setBestsellerModalOpen(false)}>✕</button>
            <h2 style={{ color: 'var(--navy)' }}>🔥 ຕັ້ງຄ່າສິນຄ້າຂາຍດີ</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
              <span>ຂາຍໄດ້ຕັ້ງແຕ່</span>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                style={{ width: 90, margin: 0 }}
              />
              <span>ຊິ້ນຂຶ້ນໄປ ຖືວ່າເປັນສິນຄ້າຂາຍດີ</span>
            </div>
            <button className="primary" style={{ width: '100%' }} onClick={saveThreshold}>ບັນທຶກ</button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        message="ຕ້ອງການລຶບສິນຄ້ານີ້ບໍ?"
        danger
        onConfirm={confirmDeleteProduct}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}