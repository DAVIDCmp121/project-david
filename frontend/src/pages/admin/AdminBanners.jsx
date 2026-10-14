import { useEffect, useRef, useState } from 'react';
import { getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { usePageT } from '../../useT.js';
import bannerDict from '../../locales/banners.js';

const MAX_MAIN = 8;

const selectStyle = {
  width: '100%', padding: 9, borderRadius: 6, border: '1px solid #dfe3e8',
  background: '#fff', fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit',
};
const arrowBtn = {
  width: 34, height: 28, border: '1px solid #dfe3e8', background: '#fff',
  borderRadius: 6, cursor: 'pointer', padding: 0, fontSize: 12,
};
const primaryBtnStyle = {
  background: 'var(--blue)', color: '#fff', border: 'none',
  padding: '10px 16px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer',
};
const plainBtnStyle = {
  background: '#fff', color: '#374151', border: '1px solid #dfe3e8',
  padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
};

// ---------- popup: ເພີ່ມແບນເນີຫຼັກ ----------
function AddMainModal({ count, products, onClose, onAdded }) {
  const { t } = usePageT(bannerDict);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [linkId, setLinkId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePick(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }

  async function submit() {
    setError('');
    if (!file) {
      setError(t('bn.errPick'));
      return;
    }
    if (count >= MAX_MAIN) {
      setError(t('bn.errMax', { max: MAX_MAIN }));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('slot', 'main');
      fd.append('link_product_id', linkId);
      const res = await fetch('/api/banners', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onAdded();
        return;
      }
      setError(data.error || t('bn.errAdd'));
    } catch (e) {
      setError(t('bn.errServer'));
    }
    setBusy(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal-box"
        style={{ background: '#fff', color: '#1f2937', width: 520, maxWidth: '94%', maxHeight: '88vh', overflowY: 'auto', textAlign: 'left' }}
      >
        <button className="modal-close" style={{ color: '#1f2937' }} onClick={onClose}>✕</button>
        <h2 style={{ color: 'var(--navy)', textAlign: 'center' }}>{t('bn.addTitle')}</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 12px' }}>
          {t('bn.addHint', { max: MAX_MAIN })}
        </p>

        <input type="file" accept="image/*" onChange={handlePick} />

        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{ width: '100%', aspectRatio: '3 / 1', objectFit: 'cover', borderRadius: 8, border: '1px solid #dfe3e8', display: 'block', marginBottom: 10 }}
          />
        )}

        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 4 }}>
          {t('bn.linkHint')}
        </div>
        <select value={linkId} onChange={(e) => setLinkId(e.target.value)} style={{ ...selectStyle, marginBottom: 10 }}>
          <option value="">{t('bn.noLink')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={onClose} style={{ ...plainBtnStyle, flex: 1 }}>{t('common.cancel')}</button>
          <button disabled={busy} onClick={submit} style={{ ...primaryBtnStyle, flex: 1 }}>
            {busy ? '...' : t('bn.addSubmit')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- ຊ່ອງແບນເນີຂ້າງ (ມີໄດ້ຊ່ອງລະ 1 ຮູບ) ----------
function SideSlot({ title, slot, banner, products, onChanged }) {
  const { t } = usePageT(bannerDict);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [linkId, setLinkId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileRef = useRef(null);

  // ຊິງຄ່າລິ້ງກັບຂໍ້ມູນທີ່ບັນທຶກແລ້ວ
  useEffect(() => {
    setLinkId(banner && banner.link_product_id ? String(banner.link_product_id) : '');
  }, [banner]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePick(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }

  async function changeLink(value) {
    setLinkId(value);
    if (!banner) return; // ຍັງບໍ່ມີຮູບ — ຈະສົ່ງພ້ອມຕອນອັບໂຫລດ
    try {
      await fetch(`/api/banners/${banner.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ link_product_id: value }),
      });
      onChanged();
    } catch (e) {
      onChanged();
    }
  }

  async function upload() {
    setError('');
    if (!file) {
      setError(t('bn.errPick'));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('slot', slot);
      fd.append('link_product_id', linkId);
      const res = await fetch('/api/banners', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFile(null);
        setPreview('');
        if (fileRef.current) fileRef.current.value = '';
        onChanged();
      } else {
        setError(data.error || t('bn.errUpload'));
      }
    } catch (e) {
      setError(t('bn.errServer'));
    }
    setBusy(false);
  }

  async function confirmDelete() {
    setDeleteOpen(false);
    await fetch(`/api/banners/${banner.id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    onChanged();
  }

  const shownImage = preview || (banner ? banner.image_url : '');

  return (
    <div style={{ flex: '1 1 280px', minWidth: 240, border: '1px solid #eef0f2', borderRadius: 10, padding: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--navy)' }}>{title}</div>

      <div
        style={{
          width: '100%', aspectRatio: '3 / 1', borderRadius: 8, overflow: 'hidden',
          background: '#f3f4f6', border: '1px solid #dfe3e8', marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem',
        }}
      >
        {shownImage ? (
          <img src={shownImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          t('bn.noImage')
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} />

      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>{t('bn.slotLinkHint')}</div>
      <select value={linkId} onChange={(e) => changeLink(e.target.value)} style={{ ...selectStyle, marginBottom: 8 }}>
        <option value="">{t('bn.noLink')}</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <div style={{ color: '#dc2626', fontSize: '0.85rem', minHeight: 18 }}>{error}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={primaryBtnStyle} disabled={busy} onClick={upload}>
          {busy ? '...' : (banner ? t('bn.changeImg') : t('bn.upload'))}
        </button>
        {banner && (
          <button className="del-btn" onClick={() => setDeleteOpen(true)}>{t('bn.del')}</button>
        )}
      </div>

      <ConfirmModal
        open={deleteOpen}
        message={t('bn.confirmDel')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

// ---------- popup: ແບນເນີຂ້າງ 2 ຊ່ອງ ----------
function SideModal({ side1, side2, products, onChanged, onClose }) {
  const { t } = usePageT(bannerDict);
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="modal-box"
        style={{ background: '#fff', color: '#1f2937', width: 760, maxWidth: '94%', maxHeight: '88vh', overflowY: 'auto', textAlign: 'left' }}
      >
        <button className="modal-close" style={{ color: '#1f2937' }} onClick={onClose}>✕</button>
        <h2 style={{ color: 'var(--navy)', textAlign: 'center' }}>{t('bn.sideTitle')}</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 12px' }}>
          {t('bn.sideHint')}
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <SideSlot title={t('bn.slotTop')} slot="side1" banner={side1} products={products} onChanged={onChanged} />
          <SideSlot title={t('bn.slotBottom')} slot="side2" banner={side2} products={products} onChanged={onChanged} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button onClick={onClose} style={plainBtnStyle}>{t('bn.close')}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- ໜ້າຈັດການແບນເນີ ----------
export default function AdminBanners() {
  const { t } = usePageT(bannerDict);
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const mainBanners = banners.filter((b) => (b.slot || 'main') === 'main');
  const side1 = banners.find((b) => b.slot === 'side1') || null;
  const side2 = banners.find((b) => b.slot === 'side2') || null;

  async function loadBanners() {
    const res = await fetch('/api/banners');
    const data = await res.json();
    setBanners(Array.isArray(data) ? data : []);
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      // ບໍ່ເປັນຫຍັງ — ຍັງໃຊ້ໄດ້ ແຕ່ບໍ່ມີລາຍຊື່ໃຫ້ເລືອກລິ້ງ
    }
  }

  useEffect(() => {
    loadBanners();
    loadProducts();
  }, []);

  async function move(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= mainBanners.length) return;
    const next = [...mainBanners];
    [next[index], next[j]] = [next[j], next[index]];
    // ອັບເດດ state: ເອົາແບນເນີຫຼັກຕາມລຳດັບໃໝ່ + ແບນເນີຂ້າງຄືເກົ່າ
    setBanners([...next, ...banners.filter((b) => (b.slot || 'main') !== 'main')]);
    try {
      await fetch('/api/banners/reorder', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ids: next.map((b) => b.id) }),
      });
    } catch (e) {
      loadBanners();
    }
  }

  async function changeLink(id, value) {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, link_product_id: value ? Number(value) : null } : b)));
    try {
      await fetch(`/api/banners/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ link_product_id: value }),
      });
    } catch (e) {
      loadBanners();
    }
  }

  async function confirmDelete() {
    const id = deleteTarget;
    setDeleteTarget(null);
    await fetch(`/api/banners/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    loadBanners();
  }

  return (
    <div>
      {/* ---------- ປຸ່ມດ້ານເທິງ ---------- */}
      <div className="admin-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="primary" onClick={() => setAddOpen(true)}>{t('bn.addBtn')}</button>
        <button className="primary" onClick={() => setSideOpen(true)}>{t('bn.sideBtn')}</button>
      </div>

      {/* ---------- ແບນເນີຫຼັກທີ່ມີຢູ່ ---------- */}
      <div className="admin-card">
        <h3 style={{ margin: '0 0 12px', color: 'var(--navy)' }}>
          {t('bn.mainTitle', { n: mainBanners.length, max: MAX_MAIN })}
        </h3>
        {mainBanners.length === 0 && <p style={{ color: '#6b7280' }}>{t('bn.none')}</p>}

        {mainBanners.map((b, idx) => (
          <div
            key={b.id}
            style={{
              display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
              padding: '12px 0', borderTop: idx === 0 ? 'none' : '1px solid #eef0f2',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button type="button" style={arrowBtn} disabled={idx === 0} onClick={() => move(idx, -1)}>▲</button>
              <button type="button" style={arrowBtn} disabled={idx === mainBanners.length - 1} onClick={() => move(idx, 1)}>▼</button>
            </div>
            <span style={{ width: 22, textAlign: 'center', color: '#9ca3af', fontWeight: 600 }}>{idx + 1}</span>
            <img
              src={b.image_url}
              alt=""
              style={{ width: 240, maxWidth: '100%', aspectRatio: '3 / 1', objectFit: 'cover', borderRadius: 8, border: '1px solid #dfe3e8' }}
            />
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 4 }}>{t('bn.linkTo')}</div>
              <select value={b.link_product_id || ''} onChange={(e) => changeLink(b.id, e.target.value)} style={selectStyle}>
                <option value="">{t('bn.noLink')}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button className="del-btn" onClick={() => setDeleteTarget(b.id)}>{t('bn.del')}</button>
          </div>
        ))}
      </div>

      {addOpen && (
        <AddMainModal
          count={mainBanners.length}
          products={products}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false);
            loadBanners();
          }}
        />
      )}

      {sideOpen && (
        <SideModal
          side1={side1}
          side2={side2}
          products={products}
          onChanged={loadBanners}
          onClose={() => setSideOpen(false)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        message={t('bn.confirmDel')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}