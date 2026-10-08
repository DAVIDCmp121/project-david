import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { ImageBadges, PriceBlock } from '../../components/ProductBadges.jsx';

const AUTO_SLIDE_MS = 3000;

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
`;

const sectionTitle = { fontSize: '1rem', color: 'var(--cust-text)', margin: '0 0 8px' };
const chipStyle = {
  background: 'var(--cust-card)', border: '1px solid var(--cust-border)',
  borderRadius: 999, padding: '4px 12px', fontSize: '0.8rem', color: 'var(--cust-text-muted)',
};

function ProductDetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  const [product, setProduct] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [sizeError, setSizeError] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    load();
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

  function showToast(msg, ms = 1800) {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  }

  const images = product ? (product.images || []) : [];
  const sizeChart = product && Array.isArray(product.size_chart) ? product.size_chart : [];
  const sizeOptions = product ? (product.size_options || []) : [];
  const needSize = sizeOptions.length > 0;
  const soldOut = product ? product.stock <= 0 : false;

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

  function pickSize(s) {
    setSelectedSize(s);
    setSizeError(false);
  }

  // ກວດວ່າເລືອກໄຊສ໌ແລ້ວບໍ (ສິນຄ້າທີ່ຕ້ອງເລືອກ) ແລ້ວສ້າງຂໍ້ມູນສົ່ງເຂົ້າຕະກຣ້າ
  function buildPayload() {
    if (needSize && !selectedSize) {
      setSizeError(true);
      showToast('ກະລຸນາເລືອກໄຊສ໌ກ່ອນ', 2200);
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
      const { ok, data } = await apiPost('/api/cart', payload);
      if (ok) {
        refreshCartCount();
        showToast('ເພີ່ມລົງກະຕ່າແລ້ວ');
      } else {
        showToast(data.error || 'ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ', 2200);
      }
    } catch (err) {
      console.error(err);
      showToast('ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ', 2200);
    } finally {
      setBusy(false);
    }
  }

  async function buyNow() {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const { ok, data } = await apiPost('/api/cart', payload);
      if (!ok) {
        showToast(data.error || 'ເພີ່ມສິນຄ້າບໍ່ສຳເລັດ', 2200);
        return;
      }
      refreshCartCount();
      navigate('/menu/checkout');
    } catch (err) {
      console.error(err);
      showToast('ເພີ່ມສິນຄ້າບໍ່ສຳເລັດ', 2200);
    } finally {
      setBusy(false);
    }
  }

  const backButton = (
    <button
      onClick={() => navigate('/menu')}
      style={{ background: 'none', border: 'none', color: 'var(--cust-text-muted)', fontSize: '0.95rem', padding: '6px 0', cursor: 'pointer' }}
    >
      ← ກັບຄືນ
    </button>
  );

  const arrowStyle = (side) => ({
    position: 'absolute', top: '50%', [side]: 10, transform: 'translateY(-50%)',
    width: 34, height: 34, borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.85)', color: '#374151', fontSize: 22, lineHeight: 1,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', padding: 0,
  });

  const sizeBtnStyle = (active) => ({
    minWidth: 54,
    padding: '9px 16px',
    borderRadius: 10,
    border: `1px solid ${active ? 'var(--gold)' : (sizeError ? '#dc2626' : '#d1d5db')}`,
    background: active ? 'var(--gold)' : '#fff',
    color: active ? '#fff' : 'var(--cust-text)',
    fontWeight: 600,
    fontSize: '0.92rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

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
            <p>ໂຫລດຂໍ້ມູນສິນຄ້າບໍ່ສຳເລັດ</p>
            <button onClick={load}>ລອງໃໝ່</button>
          </div>
        )}

        {!loadError && !product && (
          <p style={{ padding: 20, color: 'var(--cust-text-muted)' }}>ກຳລັງໂຫລດ...</p>
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
                    ບໍ່ມີຮູບ
                  </div>
                )}

                {images.length > 1 && slide > 0 && (
                  <button aria-label="ກ່ອນໜ້າ" onClick={() => goToSlide(slide - 1)} style={arrowStyle('left')}>‹</button>
                )}
                {images.length > 1 && slide < images.length - 1 && (
                  <button aria-label="ຖັດໄປ" onClick={() => goToSlide(slide + 1)} style={arrowStyle('right')}>›</button>
                )}
              </div>

              {images.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '10px 0 2px' }}>
                  {images.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`ຮູບທີ ${i + 1}`}
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
                <button
                  onClick={toggleFavorite}
                  aria-label="ຖືກໃຈ"
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

              <PriceBlock product={product} large />
              {product.is_promo && product.promo_end && (
                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: 4 }}>
                  ໂປຣນີ້ເຖິງວັນທີ {product.promo_end.split('-').reverse().join('/')}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
                {product.category && <span style={chipStyle}>ໝວດ: {product.category}</span>}
                {!needSize && product.size && <span style={chipStyle}>ໄຊສ໌: {product.size}</span>}
                {product.color && <span style={chipStyle}>ສີ: {product.color}</span>}
                <span style={chipStyle}>ເຫຼືອ: {product.stock} ອັນ</span>
              </div>

              {product.description && (
                <section style={{ marginTop: 18 }}>
                  <h3 style={sectionTitle}>ລາຍລະອຽດສິນຄ້າ</h3>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--cust-text-muted)', fontSize: '0.92rem', margin: 0 }}>
                    {product.description}
                  </p>
                </section>
              )}

              {sizeChart.length > 0 && (
                <section style={{ marginTop: 18 }}>
                  <h3 style={sectionTitle}>ຕາຕະລາງຂະໜາດ (cm)</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'center' }}>
                    <thead>
                      <tr>
                        {['ໄຊສ໌', 'ອົກ', 'ຍາວ'].map((h) => (
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
                    ເລືອກໄຊສ໌
                    {selectedSize && (
                      <span style={{ color: 'var(--gold)', marginLeft: 8 }}>: {selectedSize}</span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {sizeOptions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => pickSize(s)}
                        style={sizeBtnStyle(selectedSize === s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {sizeError && (
                    <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 8 }}>
                      ກະລຸນາເລືອກໄຊສ໌ກ່ອນ
                    </div>
                  )}
                </section>
              )}

              <section style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600 }}>ຈຳນວນ</span>
                  <div className="qty-control" style={{ margin: 0 }}>
                    <button disabled={qty <= 1 || soldOut} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                    <button disabled={qty >= product.stock || soldOut} onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    disabled={soldOut || busy}
                    onClick={addToCart}
                    style={{
                      flex: 1, padding: '13px 10px', borderRadius: 10, border: '1px solid var(--gold)',
                      background: '#fff', color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.95rem',
                      cursor: 'pointer', opacity: soldOut || busy ? 0.5 : 1,
                    }}
                  >
                    ເພີ່ມລົງກະຕ່າ
                  </button>
                  <button
                    disabled={soldOut || busy}
                    onClick={buyNow}
                    style={{
                      flex: 1, padding: '13px 10px', borderRadius: 10, border: 'none',
                      background: 'var(--gold)', color: '#fff', fontWeight: 'bold', fontSize: '0.95rem',
                      cursor: 'pointer', opacity: soldOut || busy ? 0.5 : 1,
                    }}
                  >
                    {soldOut ? 'ສິນຄ້າໝົດ' : 'ຊື້ເລີຍ'}
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
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