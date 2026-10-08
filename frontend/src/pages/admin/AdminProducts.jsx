import { useEffect, useRef, useState } from 'react';
import { getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import DateField from '../../components/DateField.jsx';

const MAX_IMAGES = 6;
const NEW_CATEGORY = '__new__';
const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
const DEFAULTS_KEY = 'adminProductDefaults';
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

// ---------- ຈື່ຄ່າຈາກຊິ້ນກ່ອນ (ເກັບໃນ browser) ----------
function readDefaults() {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch (e) {
    return {};
  }
}
function writeDefaults(data) {
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(data));
  } catch (e) {
    // ບໍ່ເປັນຫຍັງ ຖ້າເກັບບໍ່ໄດ້
  }
}
function clearDefaults() {
  try {
    localStorage.removeItem(DEFAULTS_KEY);
  } catch (e) {
    // ignore
  }
}

function parseSizes(str) {
  return (str || '').split(/[\/\\,]+/).map((s) => s.trim()).filter(Boolean);
}

// ---------- ຟອມເພີມ / ແກໄຂ / ຄັດລອກສິນຄ້າ (popup) ----------
function ProductFormModal({ mode, productId, categories, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const isCopy = mode === 'copy';
  const needsLoad = isEdit || isCopy;

  // ຄ່າທີ່ຈື່ໄວ້ຈາກຊິ້ນກ່ອນ (ໃຊ້ສະເພາະໂໝດເພີ່ມໃໝ່)
  const defaultsRef = useRef(null);
  if (defaultsRef.current === null) {
    defaultsRef.current = mode === 'add' ? readDefaults() : {};
  }
  const d = defaultsRef.current;

  const [loading, setLoading] = useState(needsLoad);
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    price: d.price ?? '',
    size: d.size ?? '',
    description: d.description ?? '',
  }));
  const [hasDefaults, setHasDefaults] = useState(Object.keys(d).length > 0);
  const [categoryChoice, setCategoryChoice] = useState(d.category || '');
  const [newCategory, setNewCategory] = useState('');
  const [images, setImages] = useState([]);
  const [sizeRows, setSizeRows] = useState(Array.isArray(d.sizeRows) ? d.sizeRows : []);
  const [sizeSelectable, setSizeSelectable] = useState(!!d.sizeSelectable);
  const [promoActive, setPromoActive] = useState(false);
  const [promoPercent, setPromoPercent] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [bsMode, setBsMode] = useState('auto');
  const [showMore, setShowMore] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dropActive, setDropActive] = useState(false);

  const fileRef = useRef(null);
  const nameRef = useRef(null);
  const boxRef = useRef(null);
  const keyRef = useRef(0);
  const imagesRef = useRef([]);
  imagesRef.current = images;
  const addFilesRef = useRef(null);

  function nextKey() {
    keyRef.current += 1;
    return keyRef.current;
  }

  // ໂຫລດຂໍ້ມູນ (ແກ້ໄຂ / ຄັດລອກ)
  useEffect(() => {
    if (!needsLoad) return undefined;
    (async () => {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const p = await res.json();
        setForm({
          name: p.name || '',
          price: p.price ?? '',
          size: p.size || '',
          // ຄັດລອກ: ລ້າງສີ ແລະ ສະຕັອກ ເພາະມັກຈະຕ່າງກັນ
          color: isCopy ? '' : (p.color || ''),
          stock: isCopy ? '' : (p.stock ?? ''),
          description: p.description || '',
        });
        setCategoryChoice(p.category || '');
        setPromoActive(!!p.promo_active);
        setPromoPrice(p.promo_price ?? '');
        setPromoStart(p.promo_start || '');
        setPromoEnd(p.promo_end || '');
        setBsMode(p.bestseller_mode || 'auto');
        setSizeSelectable(!!p.size_selectable);
        // ຄັດລອກ: ບໍ່ເອົາຮູບມານຳ (ຕ້ອງເພີ່ມຮູບໃໝ່)
        if (!isCopy) {
          setImages((p.images || []).map((url) => ({ key: nextKey(), url })));
        }
        setSizeRows(
          Array.isArray(p.size_chart)
            ? p.size_chart.map((r) => ({ size: r.size || '', chest: r.chest || '', length: r.length || '' }))
            : []
        );
        setShowMore(true);
      } catch (e) {
        setError('ໂຫລດຂໍ້ມູນສິນຄ້າບໍ່ສຳເລັດ');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ໂຟກັສຊ່ອງຊື່ສິນຄ້າເມື່ອຟອມພ້ອມ
  useEffect(() => {
    if (loading) return;
    if (nameRef.current) {
      nameRef.current.focus();
      if (isCopy) nameRef.current.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
    };
  }, []);

  // ວາງຮູບດ້ວຍ Ctrl+V
  useEffect(() => {
    function onPaste(e) {
      const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length === 0) return;
      e.preventDefault();
      if (addFilesRef.current) addFilesRef.current(files);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  function addFiles(list) {
    const picked = list.filter((f) => f.type.startsWith('image/'));
    if (picked.length === 0) return;
    const slots = MAX_IMAGES - imagesRef.current.length;
    if (slots <= 0) {
      alert(`ອັບໂຫລດໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ`);
      return;
    }
    if (picked.length > slots) {
      alert(`ເພີ່ມໄດ້ອີກ ${slots} ຮູບ ລະບົບຈະໃຊ້ ${slots} ຮູບທຳອິດ`);
    }
    const added = picked.slice(0, slots).map((file) => ({
      key: nextKey(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...added]);
  }
  addFilesRef.current = addFiles;

  function handlePickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    addFiles(picked);
  }

  function handleDropImages(e) {
    e.preventDefault();
    setDropActive(false);
    addFiles(Array.from(e.dataTransfer.files || []));
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

  // ກົດເລືອກໄຊສ໌ (S / M / L ...)
  function toggleSize(opt) {
    const cur = parseSizes(form.size);
    const has = cur.some((s) => s.toUpperCase() === opt);
    const next = has ? cur.filter((s) => s.toUpperCase() !== opt) : [...cur, opt];
    const known = SIZE_OPTIONS.filter((o) => next.some((s) => s.toUpperCase() === o));
    const custom = next.filter((s) => !SIZE_OPTIONS.includes(s.toUpperCase()));
    setForm({ ...form, size: [...known, ...custom].join('\\') });
  }

  function resolveCategory() {
    if (categoryChoice !== NEW_CATEGORY) return categoryChoice;
    const typed = newCategory.trim();
    const same = categories.find((c) => c.toLowerCase() === typed.toLowerCase());
    return same || typed;
  }

  function handlePercentChange(v) {
    setPromoPercent(v);
    const pct = Number(v);
    const base = Number(form.price);
    if (pct > 0 && pct < 100 && base > 0) {
      setPromoPrice(String(Math.round(base * (1 - pct / 100))));
    }
  }

  // ຖ້າວັນເລີ່ມໂປຣເລື່ອນໄປເກີນວັນສິ້ນສຸດ ໃຫ້ລ້າງວັນສິ້ນສຸດ (ບໍ່ໃຫ້ຄ້າງຄ່າຜິດ)
  function handlePromoStartChange(v) {
    setPromoStart(v);
    if (v && promoEnd && promoEnd < v) setPromoEnd('');
  }

  function handleClearDefaults() {
    clearDefaults();
    setHasDefaults(false);
    setForm((f) => ({ ...f, price: '', size: '', description: '' }));
    setCategoryChoice('');
    setSizeRows([]);
    setSizeSelectable(false);
  }

  // ກົດ Enter ເພື່ອຂ້າມໄປຊ່ອງຕໍ່ໄປ / Ctrl+Enter ເພື່ອບັນທຶກແລ້ວເພີ່ມຕໍ່
  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    const t = e.target;
    if (e.ctrlKey || e.metaKey) {
      if (!isEdit) {
        e.preventDefault();
        validateAndSave(true);
      }
      return;
    }
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
    if (t.tagName === 'INPUT' && (t.type === 'checkbox' || t.type === 'file')) return;
    e.preventDefault();
    const box = boxRef.current;
    if (!box) return;
    const items = Array.from(
      box.querySelectorAll('input:not([type=file]):not([type=checkbox]), select, textarea')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
    const i = items.indexOf(t);
    if (i >= 0 && i < items.length - 1) items[i + 1].focus();
  }

  function validateAndSave(andNext) {
    setError('');
    setNotice('');
    if (!form.name || !form.price) {
      setError('ກະລຸນາໃສ່ຊື່ສິນຄ້າ ແລະ ລາຄາ');
      return;
    }
    if (categoryChoice === NEW_CATEGORY && !newCategory.trim()) {
      setError('ກະລຸນາໃສ່ຊື່ໝວດໃໝ່');
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
    else submit(!!andNext);
  }

  async function submit(andNext = false) {
    setSaving(true);
    setError('');

    const category = resolveCategory();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('price', form.price);
    fd.append('size', form.size);
    fd.append('color', form.color);
    fd.append('stock', form.stock === '' ? 0 : form.stock);
    fd.append('description', form.description);
    fd.append('category', category);
    fd.append('size_chart', JSON.stringify(sizeRows));
    fd.append('promo_active', promoActive ? '1' : '0');
    fd.append('promo_price', promoPrice === '' ? '' : promoPrice);
    fd.append('promo_start', promoStart);
    fd.append('promo_end', promoEnd);
    fd.append('bestseller_mode', bsMode);
    fd.append('size_selectable', sizeSelectable ? '1' : '0');
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
        if (!isEdit) {
          // ຈື່ຄ່າໄວ້ໃຊ້ກັບຊິ້ນຕໍ່ໄປ
          writeDefaults({
            category,
            price: form.price,
            size: form.size,
            sizeSelectable,
            description: form.description,
            sizeRows,
          });
        }
        if (andNext) {
          const savedName = form.name;
          images.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
          setImages([]);
          setForm((f) => ({ ...f, name: '', color: '', stock: '' }));
          setCategoryChoice(category);
          setNewCategory('');
          setPromoActive(false);
          setPromoPercent('');
          setPromoPrice('');
          setPromoStart('');
          setPromoEnd('');
          setBsMode('auto');
          setHasDefaults(true);
          setNotice(`ເພີ່ມ "${savedName}" ສຳເລັດ ✅ ພ້ອມເພີ່ມຊິ້ນຕໍ່ໄປ`);
          setSaving(false);
          onSaved(true);
          if (boxRef.current) boxRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          if (nameRef.current) nameRef.current.focus();
          return;
        }
        onSaved(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || (isEdit ? 'ອັບເດດສິນຄ້າບໍ່ສຳເລັດ' : 'ເພີ່ມສິນຄ້າບໍ່ສຳເລັດ'));
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

  const selectedSizes = parseSizes(form.size).map((s) => s.toUpperCase());
  const title = isEdit ? 'ແກ້ໄຂສິນຄ້າ' : isCopy ? 'ຄັດລອກສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່';
  const hasRememberedMore = !isEdit && !isCopy && (form.description || sizeRows.length > 0);

  return (
    <>
      <div className="modal-overlay">
        <div
          ref={boxRef}
          onKeyDown={handleKeyDown}
          className="modal-box"
          style={{ background: '#fff', color: '#1f2937', width: 520, maxWidth: '94%', maxHeight: '88vh', overflowY: 'auto', textAlign: 'left' }}
        >
          <button className="modal-close" style={{ color: '#1f2937' }} onClick={onClose}>✕</button>
          <h2 style={{ color: 'var(--navy)', textAlign: 'center' }}>{title}</h2>

          {loading ? (
            <p style={{ textAlign: 'center' }}>ກຳລັງໂຫລດ...</p>
          ) : (
            <>
              {notice && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '0.88rem' }}>
                  {notice}
                </div>
              )}

              {isCopy && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '0.85rem' }}>
                  ຄັດລອກຂໍ້ມູນຈາກສິນຄ້າເດີມ — ແກ້ຊື່, ສີ, ສະຕັອກ ແລະ ເພີ່ມຮູບໃໝ່
                </div>
              )}

              {hasDefaults && !isEdit && !isCopy && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#6b7280', marginBottom: 8 }}>
                  <span>ໃຊ້ໝວດ, ລາຄາ, ໄຊສ໌ ຈາກຊິ້ນກ່ອນໃຫ້ແລ້ວ</span>
                  <button
                    type="button"
                    onClick={handleClearDefaults}
                    style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}
                  >
                    ລ້າງຄ່າທີ່ຈື່ໄວ້
                  </button>
                </div>
              )}

              <input
                ref={nameRef}
                placeholder="ຊື່ສິນຄ້າ"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  placeholder="ລາຄາ"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <input
                  placeholder="ຈຳນວນສະຕັອກ"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>

              <div style={{ fontWeight: 600, margin: '6px 0' }}>ໄຊສ໌</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {SIZE_OPTIONS.map((opt) => {
                  const active = selectedSizes.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleSize(opt)}
                      style={{
                        minWidth: 46, padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.88rem',
                        border: active ? '1px solid var(--blue)' : '1px solid #dfe3e8',
                        background: active ? 'var(--blue)' : '#fff',
                        color: active ? '#fff' : '#374151',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              <input
                placeholder="ໄຊສ໌ (ເຊັ່ນ M\L\XL) — ກົດປຸ່ມຂ້າງເທິງ ຫຼື ພິມເອງ"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 0 6px', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sizeSelectable}
                  onChange={(e) => setSizeSelectable(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                ໃຫ້ລູກຄ້າເລືອກໄຊສ໌ (ແຍກໄຊສ໌ດ້ວຍ / ຫຼື \)
              </label>
              {sizeSelectable && (
                <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 10px' }}>
                  ຕົວເລືອກທີ່ລູກຄ້າຈະເຫັນ: {parseSizes(form.size).join(' | ') || '—'}
                </div>
              )}

              <input placeholder="ສີ" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />

              <div style={{ fontWeight: 600, margin: '6px 0' }}>
                ຮູບສິນຄ້າ ({images.length}/{MAX_IMAGES}) — ຮູບທຳອິດຄືຮູບໜ້າປົກ
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                onDragLeave={() => setDropActive(false)}
                onDrop={handleDropImages}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 6, padding: 8, borderRadius: 10,
                  border: dropActive ? '2px dashed var(--blue)' : '2px dashed transparent',
                  background: dropActive ? '#eff6ff' : 'transparent',
                }}
              >
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
              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 10 }}>
                ເລືອກໄດ້ຫຼາຍຮູບພ້ອມກັນ • ກົດ Ctrl+V ເພື່ອວາງຮູບ ຫຼື ລາກຮູບມາວາງໃນກອບນີ້
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePickFiles} style={{ display: 'none' }} />

              {/* ---------- ຕົວເລືອກເພີ່ມເຕີມ (ພັບໄວ້) ---------- */}
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                style={{ ...plainBtnStyle, width: '100%', textAlign: 'left', padding: '9px 12px', marginBottom: 10 }}
              >
                {showMore ? '▼' : '▶️'} ຕົວເລືອກເພີ່ມເຕີມ (ລາຍລະອຽດ, ຕາຕະລາງຂະໜາດ, ໂປຣໂມຊັນ, ປ້າຍຂາຍດີ)
                {!showMore && hasRememberedMore && (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
                    ມີລາຍລະອຽດ / ຕາຕະລາງຂະໜາດຈາກຊິ້ນກ່ອນໄວ້ໃຫ້ແລ້ວ
                  </span>
                )}
              </button>

              {showMore && (
                <>
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
                      ຈັດໂປຣໂມຊັນສິນຄ້ານີ້
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
                            <DateField
                              value={promoStart}
                              onChange={handlePromoStartChange}
                              style={{ margin: 0 }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 2px' }}>
                              ວັນສິ້ນສຸດໂປຣ (ເວັ້ນວ່າງ = ບໍ່ມີກຳນົດ)
                            </div>
                            <DateField
                              value={promoEnd}
                              onChange={setPromoEnd}
                              min={promoStart}
                              style={{ margin: 0 }}
                            />
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
                </>
              )}

              <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>

              {/* ປຸ່ມຢູ່ລຸ່ມສຸດ ຕິດຕາມໜ້າຈໍ */}
              <div
                style={{
                  display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap',
                  position: 'sticky', bottom: 0, background: '#fff', padding: '8px 0 2px',
                }}
              >
                <button onClick={onClose} style={{ ...plainBtnStyle, flex: '1 1 90px' }}>ຍົກເລີກ</button>
                {!isEdit && (
                  <button
                    disabled={saving}
                    onClick={() => validateAndSave(true)}
                    title="ທາງລັດ: Ctrl+Enter"
                    style={{ ...plainBtnStyle, flex: '2 1 160px', borderColor: 'var(--blue)', color: 'var(--blue)', fontWeight: 'bold' }}
                  >
                    {saving ? '...' : 'ບັນທຶກ + ເພີ່ມຊິ້ນຕໍ່ໄປ'}
                  </button>
                )}
                <button disabled={saving} onClick={() => validateAndSave(false)} style={{ ...primaryBtnStyle, flex: '1 1 110px' }}>
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
              <button disabled={saving} onClick={() => submit(false)} style={primaryBtnStyle}>ບັນທຶກ</button>
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
  const [qrStatus, setQrStatus] = useState('ກຳລັງກວດສອບ...');
  const qrFileRef = useRef(null);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

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
      setQrStatus('QR ປັດຈຸບັນ:');
    } else {
      setQrStatus('ຍັງບໍ່ໄດ້ອັບໂຫລດ QR');
    }
  }

  async function loadThreshold() {
    try {
      const r = await fetch('/api/products/bestseller-threshold');
      const d = await r.json();
      setThreshold(String(d.threshold));
    } catch (e) {
      // ປ່ອຍເປັນຄ່າເລີ່ມຕົ້ນ
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
        alert('ບັນທຶກບໍ່ສຳເລັດ');
      }
    } catch (e) {
      alert('ບັນທຶກບໍ່ສຳເລັດ');
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
      alert('ອັບໂຫລດ QR ສຳເລັດ ✅');
      qrFileRef.current.value = '';
      loadCurrentQr();
    } else {
      alert('ອັບໂຫລດບໍ່ສຳເລັດ');
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
                      <button onClick={() => setFormModal({ mode: 'copy', id: p.id })}>ຄັດລອກ</button>
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
          onSaved={(keepOpen) => {
            if (!keepOpen) setFormModal(null);
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