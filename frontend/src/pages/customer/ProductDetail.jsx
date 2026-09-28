import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost } from '../../api';

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
    try {
      const { ok, data } = await apiGet(`/api/products/${id}`);
      if (ok && data && data.id) setProduct(data);
      else setLoadError(true);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  }

  function showToast(msg, ms = 1800) {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  }

  const images = product ? (product.images || []) : [];
  const sizeChart = product && Array.isArray(product.size_chart) ? product.size_chart : [];
  const soldOut = product ? product.stock <= 0 : false;

  function handleScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goToSlide(i) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
  }

  async function addToCart() {
    setBusy(true);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: qty });
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
    setBusy(true);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: qty });
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

  return (
    <div className="customer-shell">
      <style>{'.pd-track::-webkit-scrollbar{display:none}'}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 100
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 16px 130px' }}>
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
          <>
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#f4f4f2', border: '1px solid var(--cust-border)' }}>
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

            <h1 style={{ fontSize: '1.3rem', margin: '14px 0 4px', color: 'var(--cust-text)' }}>{product.name}</h1>
            <div style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '1.25rem' }}>{product.price} ກີບ</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
              {product.size && <span style={chipStyle}>ໄຊສ໌: {product.size}</span>}
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
          </>
        )}
      </div>

      <BottomNav />
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