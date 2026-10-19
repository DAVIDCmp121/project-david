import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { ImageBadges, PriceBlock } from '../../components/ProductBadges.jsx';
import ProductReviews, { Stars } from '../../components/ProductReviews.jsx';
import { usePageT } from '../../useT.js';
import baseDict from '../../locales/cust-product.js';
import extraDict from '../../locales/cust-product-extra.js';

// รวมข้อความเดิม + ข้อความใหม่ (ของใหม่ไม่ทับของเดิม ยกเว้นคีย์ซ้ำ)
const dict = {
  lo: { ...(baseDict.lo || {}), ...(extraDict.lo || {}) },
  th: { ...(baseDict.th || {}), ...(extraDict.th || {}) },
  en: { ...(baseDict.en || {}), ...(extraDict.en || {}) },
};

const AUTO_SLIDE_MS = 3000;
const LOW_STOCK_SHOW = 3; // ເຫຼືອບໍ່ເກີນນີ້ ຈະສະແດງ "ເຫຼືອ N ອັນ"
const RELATED_MAX = 8;
const RELATED_MIN_SAME_CATEGORY = 4;

const layoutCss = `
.pd-track::-webkit-scrollbar { display: none; }
.pd-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}
.pd-left { position: sticky; top: 88px; }
.pd-right { padding-top: 0; }
@media (max-width: 760px) {
  .pd-layout { grid-template-columns: 1fr; gap: 0; }
  .pd-left { position: static; }
  .pd-right { padding-top: 14px; }
}

/* ---------- ปุ่มแชร์ ---------- */
.pd-icon-btn {
  width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--cust-border);
  background: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; color: #6b7280; padding: 0;
}
.pd-icon-btn:hover { border-color: var(--gold); color: var(--gold); }
:root[data-theme='dark'] .pd-icon-btn {
  background: rgba(25, 25, 29, 0.85); border-color: rgba(255, 255, 255, 0.12); color: #b4b4bc;
}
:root[data-theme='dark'] .pd-icon-btn:hover { border-color: rgba(201, 162, 39, 0.6); color: #e8c25a; }

/* ---------- ดาวเฉลี่ยใต้ชื่อสินค้า ---------- */
.pd-rating-line {
  display: inline-flex; align-items: center; gap: 6px; margin: 2px 0 6px;
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 0.85rem; color: var(--cust-text-muted); font-family: inherit;
}

/* ---------- สินค้าที่เกี่ยวข้อง ---------- */
.pd-related { max-width: 1000px; margin: 0 auto; padding: 8px 16px 40px; }
.pd-related-title { font-size: 1.05rem; font-weight: 700; margin: 0 0 12px; color: var(--cust-text); }
.pd-related-row {
  display: flex; gap: 12px; overflow-x: auto; padding: 2px 2px 8px;
  scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch;
}
.pd-rel-card {
  flex: 0 0 156px; scroll-snap-align: start; background: #fff;
  border: 1px solid var(--cust-border); border-radius: 10px; overflow: hidden;
  cursor: pointer; display: flex; flex-direction: column;
  transition: box-shadow 0.15s, transform 0.15s;
}
.pd-rel-card:hover { box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1); transform: translateY(-2px); }
.pd-rel-img { position: relative; width: 100%; aspect-ratio: 1 / 1; background: #f4f4f2; }
.pd-rel-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.pd-rel-body { padding: 8px 10px 10px; }
.pd-rel-name {
  font-size: 0.84rem; line-height: 1.3; color: var(--cust-text); margin: 0 0 4px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; height: 2.6em;
}
.pd-rel-price { height: 1.7em; display: flex; align-items: center; overflow: hidden; }
@media (max-width: 600px) { .pd-rel-card { flex-basis: 140px; } }

:root[data-theme='dark'] .pd-rel-card {
  background: linear-gradient(160deg, #1f1f24 0%, #151518 100%);
  border-color: rgba(255, 255, 255, 0.07);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
}
:root[data-theme='dark'] .pd-rel-card:hover {
  border-color: rgba(201, 162, 39, 0.4);
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.6), 0 0 22px rgba(201, 162, 39, 0.15);
}
:root[data-theme='dark'] .pd-rel-img { background: #26262b; }
`;

const sectionTitle = { fontSize: '1rem', color: 'var(--cust-text)', margin: '0 0 8px' };
const chipStyle = {
  background: 'var(--cust-card)', border: '1px solid var(--cust-border)',
  borderRadius: 999, padding: '4px 12px', fontSize: '0.8rem', color: 'var(--cust-text-muted)',
};

// สต็อกรวมของสินค้าในรายการ (ถ้ามี variants ให้รวมจากไซส์ที่เปิดขาย)
function listStock(p) {
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + (Number(v.stock_qty) || 0), 0);
  }
  return Number(p.stock) || 0;
}

// เลือกสินค้าที่เกี่ยวข้อง: หมวดเดียวกันก่อน ไม่พอค่อยเติมด้วยสินค้าขายดี
function pickRelated(list, currentId) {
  const me = list.find((p) => Number(p.id) === Number(currentId));
  const myCat = me ? (me.category || '').trim() : '';
  const others = list.filter((p) => Number(p.id) !== Number(currentId) && listStock(p) > 0);
  const best = (a, b) => (b.sold_count || 0) - (a.sold_count || 0) || b.id - a.id;

  const same = myCat ? others.filter((p) => (p.category || '').trim() === myCat).sort(best) : [];
  if (same.length >= RELATED_MIN_SAME_CATEGORY) return same.slice(0, RELATED_MAX);

  const rest = others.filter((p) => !same.includes(p)).sort(best);
  return [...same, ...rest].slice(0, RELATED_MAX);
}

function ProductDetailInner() {
  const { t } = usePageT(dict);
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const [rvStats, setRvStats] = useState({ average: 0, count: 0 }); // ມາຈາກ ProductReviews
  const trackRef = useRef(null);

  useEffect(() => {
    load();
    loadRelated();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    setLoadError(false);
    setProduct(null);
    setQty(1);
    setSlide(0);
    setIsFav(false);
    setSelectedSize('');
    setSizeError(false);
    setRvStats({ average: 0, count: 0 });
    try {
      const { ok, data } = await apiGet(`/api/products/${id}`);
      if (ok && data && data.id) setProduct(data);
      else setLoadError(true);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
    try {
      const idsRes = await apiGet('/api/favorites/ids');
      if (idsRes.ok && Array.isArray(idsRes.data)) setIsFav(idsRes.data.includes(Number(id)));
    } catch (err) {
      // ບໍ່ login ຫຼື error — ປ່ອຍເປັນ false
    }
  }

  async function loadRelated() {
    setRelated([]);
    try {
      const { ok, data } = await apiGet('/api/products');
      if (ok && Array.isArray(data)) setRelated(pickRelated(data, id));
    } catch (err) {
      // ไม่มีสินค้าที่เกี่ยวข้อง ก็ไม่เป็นไร
    }
  }

  function scrollToReviews() {
    const el = document.getElementById('reviews');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showToast(msg, ms = 1800) {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  }

  const images = product ? (product.images || []) : [];
  const sizeChart = product && Array.isArray(product.size_chart) ? product.size_chart : [];
  const sizeOptions = product ? (product.size_options || []) : [];
  const needSize = sizeOptions.length > 0;
  const variants = product ? (product.variants || []) : [];

  // ສະຕັອກຂອງໄຊສ໌ໜຶ່ງ (null = ບໍ່ຮູ້ / ບໍ່ມີຂໍ້ມູນ variant)
  function stockOfSize(s) {
    const v = variants.find((x) => x.size === s);
    return v ? Number(v.stock_qty) : null;
  }

  const selectedStock = needSize && selectedSize ? stockOfSize(selectedSize) : null;
  const totalStock = product ? Number(product.stock) : 0;
  const maxQty = selectedStock !== null ? selectedStock : totalStock;
  const shownStock = selectedStock !== null ? selectedStock : totalStock;
  const soldOut = product ? totalStock <= 0 : false;
  const selectedSoldOut = needSize && !!selectedSize && selectedStock === 0;

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goToSlide(i, instant = false) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: instant ? 'auto' : 'smooth' });
  }

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (images.length <= 1 || paused || reduceMotion) return undefined;

    const timer = setTimeout(() => {
      if (slide >= images.length - 1) goToSlide(0, true);
      else goToSlide(slide + 1);
    }, AUTO_SLIDE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, paused, images.length]);

  async function toggleFavorite() {
    const next = !isFav;
    setIsFav(next);
    try {
      if (next) await apiPost(`/api/favorites/${product.id}`, {});
      else await apiDelete(`/api/favorites/${product.id}`);
    } catch (err) {
      console.error(err);
    }
  }

  // แชร์: ใช้ลิงก์ /share/product/ID ของ backend (มี Open Graph ให้ LINE/Facebook แสดงรูป+ชื่อ+ราคา)
  // ตอนทดสอบบน localhost ใช้ลิงก์หน้าเว็บตรงๆ
  async function shareProduct() {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const url = isLocal
      ? window.location.href
      : `${API_BASE || window.location.origin}/share/product/${product.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // ผู้ใช้ปิดเมนูแชร์เอง
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e2) {}
      document.body.removeChild(ta);
    }
    showToast(t('cp.linkCopied'));
  }

  function pickSize(s) {
    const st = stockOfSize(s);
    if (st === 0) return; // ໄຊສ໌ໝົດ ກົດບໍ່ໄດ້
    setSelectedSize(s);
    setSizeError(false);
    // ຖ້າຈຳນວນທີ່ເລືອກໄວ້ເກີນສະຕັອກຂອງໄຊສ໌ໃໝ່ ໃຫ້ຫຼຸດລົງ
    setQty((q) => (st !== null ? Math.max(1, Math.min(q, st)) : q));
  }

  // ກວດວ່າເລືອກໄຊສ໌ແລ້ວບໍ (ສິນຄ້າທີ່ຕ້ອງເລືອກ) ແລ້ວສ້າງຂໍ້ມູນສົ່ງເຂົ້າຕະກຣ້າ
  function buildPayload() {
    if (needSize && !selectedSize) {
      setSizeError(true);
      showToast(t('cp.pickSizeFirst'), 2200);
      return null;
    }
    const payload = { product_id: product.id, quantity: qty };
    if (needSize) payload.size = selectedSize;
    return payload;
  }

  async function addToCart() {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const { ok } = await apiPost('/api/cart', payload);
      if (ok) {
        refreshCartCount();
        showToast(t('common.addedToCart'));
      } else {
        showToast(t('common.addFail'), 2600);
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.addFail'), 2200);
    } finally {
      setBusy(false);
    }
  }

  async function buyNow() {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const { ok } = await apiPost('/api/cart', payload);
      if (!ok) {
        showToast(t('cp.buyFail'), 2600);
        return;
      }
      refreshCartCount();
      navigate('/menu/checkout');
    } catch (err) {
      console.error(err);
      showToast(t('cp.buyFail'), 2200);
    } finally {
      setBusy(false);
    }
  }

  const backButton = (
    <button
      onClick={() => navigate('/menu')}
      style={{ background: 'none', border: 'none', color: 'var(--cust-text-muted)', fontSize: '0.95rem', padding: '6px 0', cursor: 'pointer' }}
    >
      ← {t('common.back')}
    </button>
  );

  const arrowStyle = (side) => ({
    position: 'absolute', top: '50%', [side]: 10, transform: 'translateY(-50%)',
    width: 34, height: 34, borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.85)', color: '#374151', fontSize: 22, lineHeight: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', padding: 0,
  });

  // ປຸ່ມໄຊສ໌: active = ເລືອກຢູ່, out = ໝົດສະຕັອກ (ສີເທົາ ກົດບໍ່ໄດ້)
  const sizeBtnStyle = (active, out) => ({
    minWidth: 54,
    padding: '9px 16px',
    borderRadius: 10,
    border: `1px solid ${out ? '#e5e7eb' : active ? 'var(--gold)' : (sizeError ? '#dc2626' : '#d1d5db')}`,
    background: out ? '#f3f4f6' : active ? 'var(--gold)' : '#fff',
    color: out ? '#9ca3af' : active ? '#fff' : 'var(--cust-text)',
    textDecoration: out ? 'line-through' : 'none',
    fontWeight: 600,
    fontSize: '0.92rem',
    cursor: out ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
  });

  const actionDisabled = soldOut || selectedSoldOut || busy;

  return (
    <div className="customer-shell">
      <style>{layoutCss}</style>

      <TopBar />

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 100
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '12px 16px 40px' }}>
        {backButton}

        {loadError && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--cust-text-muted)' }}>
            <p>{t('cp.loadFail')}</p>
            <button onClick={load}>{t('common.retry')}</button>
          </div>
        )}

        {!loadError && !product && (
          <p style={{ padding: 20, color: 'var(--cust-text-muted)' }}>{t('common.loading')}</p>
        )}

        {product && (
          <div className="pd-layout">
            {/* ---------- ซ้าย: รูปสินค้า ---------- */}
            <div className="pd-left">
              <div
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
                onTouchCancel={() => setPaused(false)}
                style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#f4f4f2', border: '1px solid var(--cust-border)' }}
              >
                <ImageBadges product={product} />
                {images.length > 0 ? (
                  <div
                    ref={trackRef}
                    className="pd-track"
                    onScroll={handleScroll}
                    style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                  >
                    {images.map((url, i) => (
                      <div key={url + i} style={{ flex: '0 0 100%', scrollSnapAlign: 'center' }}>
                        <img
                          src={`${API_BASE}${url}`}
                          alt={`${product.name} ${i + 1}`}
                          draggable={false}
                          style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    {t('cp.noImage')}
                  </div>
                )}

                {soldOut && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                  }}>
                    <span style={{ background: '#374151', color: '#fff', padding: '8px 22px', borderRadius: 999, fontWeight: 700 }}>
                      {t('common.soldOut')}
                    </span>
                  </div>
                )}

                {images.length > 1 && slide > 0 && (
                  <button aria-label={t('cp.prev')} onClick={() => goToSlide(slide - 1)} style={arrowStyle('left')}>‹</button>
                )}
                {images.length > 1 && slide < images.length - 1 && (
                  <button aria-label={t('cp.next')} onClick={() => goToSlide(slide + 1)} style={arrowStyle('right')}>›</button>
                )}
              </div>

              {images.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '10px 0 2px' }}>
                  {images.map((_, i) => (
                    <button
                      key={i}
                      aria-label={t('cp.imageN', { n: i + 1 })}
                      onClick={() => goToSlide(i)}
                      style={{
                        width: i === slide ? 22 : 8, height: 8, borderRadius: 999, border: 'none', padding: 0,
                        background: i === slide ? 'var(--gold)' : '#d1d5db', transition: 'all 0.2s', cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ---------- ขวา: รายละเอียด + ปุ่มสั่งซื้อ ---------- */}
            <div className="pd-right">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <h1 style={{ fontSize: '1.3rem', margin: '0 0 4px', color: 'var(--cust-text)' }}>{product.name}</h1>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="pd-icon-btn"
                    onClick={shareProduct}
                    aria-label={t('cp.share')}
                    title={t('cp.share')}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                  </button>
                  <button
                    onClick={toggleFavorite}
                    aria-label={t('common.favorite')}
                    style={{
                      width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--cust-border)',
                      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <svg
                      width="20" height="20" viewBox="0 0 24 24"
                      fill={isFav ? '#e53935' : 'none'}
                      stroke={isFav ? '#e53935' : '#9ca3af'}
                      strokeWidth="2"
                    >
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ดาวเฉลี่ย — กดแล้วเลื่อนไปส่วนรีวิว */}
              {rvStats.count > 0 && (
                <button type="button" className="pd-rating-line" onClick={scrollToReviews}>
                  <Stars value={rvStats.average} size={16} />
                  <span>{rvStats.average} ({rvStats.count})</span>
                </button>
              )}

              <PriceBlock product={product} large />
              {product.is_promo && product.promo_end && (
                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 4 }}>
                  {t('cp.promoUntil', { date: product.promo_end.split('-').reverse().join('/') })}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
                {product.category && <span style={chipStyle}>{t('common.category')}: {product.category}</span>}
                {!needSize && product.size && <span style={chipStyle}>{t('common.size')}: {product.size}</span>}
                {product.color && <span style={chipStyle}>{t('common.color')}: {product.color}</span>}
                <span
                  style={{
                    ...chipStyle,
                    ...(shownStock <= 0
                      ? { color: '#dc2626', borderColor: '#fecaca' }
                      : shownStock <= LOW_STOCK_SHOW
                        ? { color: '#d97706', borderColor: '#fde68a' }
                        : {}),
                  }}
                >
                  {shownStock <= 0 ? t('cp.out') : t('common.stockLeft', { n: shownStock })}
                </span>
              </div>

              {product.description && (
                <section style={{ marginTop: 18 }}>
                  <h3 style={sectionTitle}>{t('cp.description')}</h3>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--cust-text-muted)', fontSize: '0.92rem', margin: 0 }}>
                    {product.description}
                  </p>
                </section>
              )}

              {sizeChart.length > 0 && (
                <section style={{ marginTop: 18 }}>
                  <h3 style={sectionTitle}>{t('cp.sizeChart')}</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'center' }}>
                    <thead>
                      <tr>
                        {[t('common.size'), t('cp.chest'), t('cp.length')].map((h) => (
                          <th key={h} style={{ background: '#faf6ea', border: '1px solid var(--cust-border)', padding: '8px 6px', color: 'var(--cust-text)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizeChart.map((r, i) => (
                        <tr key={i}>
                          <td style={{ border: '1px solid var(--cust-border)', padding: '8px 6px', fontWeight: 600 }}>{r.size}</td>
                          <td style={{ border: '1px solid var(--cust-border)', padding: '8px 6px' }}>{r.chest || '-'}</td>
                          <td style={{ border: '1px solid var(--cust-border)', padding: '8px 6px' }}>{r.length || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* ---------- ເລືອກໄຊສ໌ ---------- */}
              {needSize && (
                <section style={{ marginTop: 22 }}>
                  <h3 style={sectionTitle}>
                    {t('cp.chooseSize')}
                    {selectedSize && (
                      <span style={{ color: 'var(--gold)', marginLeft: 8 }}>: {selectedSize}</span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {sizeOptions.map((s) => {
                      const st = stockOfSize(s);
                      const out = st === 0;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={out}
                          title={out ? t('cp.sizeOut') : undefined}
                          onClick={() => pickSize(s)}
                          style={sizeBtnStyle(selectedSize === s, out)}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  {sizeError && (
                    <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 8 }}>
                      {t('cp.pickSizeFirst')}
                    </div>
                  )}
                  {selectedStock !== null && selectedStock > 0 && selectedStock <= LOW_STOCK_SHOW && (
                    <div style={{ color: '#d97706', fontSize: '0.85rem', marginTop: 8 }}>
                      {t('cp.sizeLow', { size: selectedSize, n: selectedStock })}
                    </div>
                  )}
                </section>
              )}

              <section style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600 }}>{t('common.quantity')}</span>
                  <div className="qty-control" style={{ margin: 0 }}>
                    <button disabled={qty <= 1 || soldOut} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                    <button disabled={qty >= maxQty || soldOut} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    disabled={actionDisabled}
                    onClick={addToCart}
                    style={{
                      flex: 1, padding: '13px 10px', borderRadius: 10, border: '1px solid var(--gold)',
                      background: '#fff', color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.95rem',
                      cursor: 'pointer', opacity: actionDisabled ? 0.5 : 1,
                    }}
                  >
                    {t('common.addToCart')}
                  </button>
                  <button
                    disabled={actionDisabled}
                    onClick={buyNow}
                    style={{
                      flex: 1, padding: '13px 10px', borderRadius: 10, border: 'none',
                      background: 'var(--gold)', color: '#fff', fontWeight: 'bold', fontSize: '0.95rem',
                      cursor: 'pointer', opacity: actionDisabled ? 0.5 : 1,
                    }}
                  >
                    {soldOut ? t('common.soldOut') : t('common.buyNow')}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* ---------- รีวิวสินค้า (แยกเป็นคอมโพเนนต์ ProductReviews.jsx) ---------- */}
      {product && <ProductReviews key={id} productId={id} onStats={setRvStats} />}

      {/* ---------- สินค้าที่เกี่ยวข้อง (อยู่นอก pd-layout เพื่อไม่กระทบสไตล์ธีมมืดเดิม) ---------- */}
      {product && related.length > 0 && (
        <section className="pd-related">
          <h2 className="pd-related-title">{t('cp.related')}</h2>
          <div className="pd-related-row">
            {related.map((p) => (
              <div
                key={p.id}
                className="pd-rel-card"
                onClick={() => navigate(`/menu/product/${p.id}`)}
              >
                <div className="pd-rel-img">
                  <ImageBadges product={p} />
                  {p.image && <img src={`${API_BASE}${p.image}`} alt={p.name} />}
                </div>
                <div className="pd-rel-body">
                  <h3 className="pd-rel-name" title={p.name}>{p.name}</h3>
                  <div className="pd-rel-price">
                    <PriceBlock product={p} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ProductDetail() {
  return (
    <CartProvider>
      <ProductDetailInner />
    </CartProvider>
  );
}