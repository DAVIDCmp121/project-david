import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import HomeHero from '../../components/HomeHero.jsx';
import CategoryBar from '../../components/CategoryBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { ImageBadges, PriceBlock } from '../../components/ProductBadges.jsx';
import '../../styles/home.css';

const extraCss = `
.hm-cart { position: relative; overflow: visible; }
.hm-cart-badge {
  position: absolute; top: -7px; right: -7px;
  min-width: 18px; height: 18px; padding: 0 5px; box-sizing: border-box;
  border-radius: 999px; background: #e53935; color: #fff;
  font-size: 11px; font-weight: 700; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 2px #fff; pointer-events: none;
}

.sz-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.sz-box {
  width: 100%; max-width: 380px; background: #fff; border-radius: 16px;
  padding: 18px 18px 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  max-height: calc(100vh - 32px); overflow-y: auto;
}
.sz-head { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.sz-head img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; background: #f4f4f2; flex: 0 0 auto; }
.sz-name { font-size: 0.98rem; font-weight: 700; color: var(--cust-text, #1f2937); line-height: 1.3; }
.sz-sub { font-size: 0.8rem; color: var(--cust-text-muted, #6b7280); margin-top: 3px; }
.sz-title { font-size: 0.9rem; font-weight: 600; margin: 4px 0 8px; color: var(--cust-text, #1f2937); }
.sz-sizes { display: flex; flex-wrap: wrap; gap: 8px; }
.sz-size {
  min-width: 52px; padding: 9px 14px; border-radius: 10px; border: 1px solid #d1d5db;
  background: #fff; color: var(--cust-text, #1f2937); font-weight: 600; font-size: 0.9rem; cursor: pointer;
}
.sz-size.active { background: var(--gold); border-color: var(--gold); color: #fff; }
.sz-sizes.err .sz-size:not(.active) { border-color: #dc2626; }
.sz-err { color: #dc2626; font-size: 0.82rem; margin-top: 8px; }
.sz-qty-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; }
.sz-qty { display: flex; align-items: center; gap: 12px; }
.sz-qty button {
  width: 34px; height: 34px; border-radius: 50%; border: 1px solid #d1d5db; background: #fff;
  font-size: 18px; line-height: 1; cursor: pointer; padding: 0; color: var(--cust-text, #1f2937);
}
.sz-qty button:disabled { opacity: 0.4; cursor: not-allowed; }
.sz-qty span { min-width: 24px; text-align: center; font-weight: 700; }
.sz-actions { display: flex; gap: 10px; margin-top: 20px; }
.sz-actions button { flex: 1; height: 44px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
.sz-cancel { background: #fff; border: 1px solid #d1d5db; color: #374151; }
.sz-confirm { background: var(--gold); border: 1px solid var(--gold); color: #fff; }
.sz-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ---------- การ์ดสินค้า (แบบ Shopee) ----------
function MiniCard({ p, isFav, busy, cartCount, onOpen, onFav, onCart, onBuy }) {
  const soldOut = p.stock <= 0;
  return (
    <div className="hm-card" onClick={() => onOpen(p.id)}>
      <div className="hm-card-img">
        <ImageBadges product={p} />
        {p.image && <img src={`${API_BASE}${p.image}`} alt={p.name} />}
        {soldOut && <div className="hm-soldout">ສິນຄ້າໝົດ</div>}
        <button className="hm-fav" aria-label="ຖືກໃຈ" onClick={(e) => onFav(e, p.id)}>
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill={isFav ? '#e53935' : 'none'}
            stroke={isFav ? '#e53935' : '#9ca3af'}
            strokeWidth="2"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
      </div>

      <div className="hm-card-body">
        <h3 className="hm-name" title={p.name}>{p.name}</h3>

        <div className="hm-meta" title={`ໄຊສ໌: ${p.size || '-'}`}>ໄຊສ໌: {p.size || '-'}</div>
        <div className="hm-meta" title={`ສີ: ${p.color || '-'}`}>ສີ: {p.color || '-'}</div>

        <div className="hm-price-slot">
          <PriceBlock product={p} />
        </div>

        <div className="hm-stockrow">
          <span>ເຫຼືອ: {p.stock} ອັນ</span>
          <span>{p.sold_count > 0 ? `ຂາຍແລ້ວ ${p.sold_count} ຊິ້ນ` : ''}</span>
        </div>

        <div className="hm-actions">
          <button
            className="hm-buy"
            disabled={soldOut || busy}
            onClick={(e) => { e.stopPropagation(); onBuy(p); }}
          >
            {soldOut ? 'ສິນຄ້າໝົດ' : (busy ? '...' : 'ຊື້ເລີຍ')}
          </button>
          <button
            className="hm-cart"
            title="ເພີ່ມລົງກະຕ່າ"
            disabled={soldOut || busy}
            onClick={(e) => { e.stopPropagation(); onCart(p); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && <span className="hm-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- ป๊อปอัปเลือกไซส์ ----------
function SizeModal({ product, inCart, onCancel, onConfirm, busy }) {
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);

  const options = product.size_options || [];
  const maxQty = Math.max(0, product.stock - inCart);

  function submit() {
    if (!size) {
      setError(true);
      return;
    }
    onConfirm(size, qty);
  }

  return (
    <div className="sz-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="sz-box">
        <div className="sz-head">
          {product.image && <img src={`${API_BASE}${product.image}`} alt={product.name} />}
          <div>
            <div className="sz-name">{product.name}</div>
            <div className="sz-sub">
              ເຫຼືອ: {product.stock} ອັນ{inCart > 0 ? ` · ໃນກະຕ່າ ${inCart} ອັນ` : ''}
            </div>
          </div>
        </div>

        <div className="sz-title">
          ເລືອກໄຊສ໌{size && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>: {size}</span>}
        </div>
        <div className={`sz-sizes${error ? ' err' : ''}`}>
          {options.map((s) => (
            <button
              key={s}
              type="button"
              className={`sz-size${size === s ? ' active' : ''}`}
              onClick={() => { setSize(s); setError(false); }}
            >
              {s}
            </button>
          ))}
        </div>
        {error && <div className="sz-err">ກະລຸນາເລືອກໄຊສ໌ກ່ອນ</div>}

        <div className="sz-qty-row">
          <span className="sz-title" style={{ margin: 0 }}>ຈຳນວນ</span>
          <div className="sz-qty">
            <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
          </div>
        </div>
        {maxQty <= 0 && <div className="sz-err">ໃນກະຕ່າຄົບຕາມສະຕັອກແລ້ວ</div>}

        <div className="sz-actions">
          <button type="button" className="sz-cancel" onClick={onCancel}>ຍົກເລີກ</button>
          <button type="button" className="sz-confirm" disabled={busy || maxQty <= 0} onClick={submit}>
            {busy ? '...' : 'ເພີ່ມກະຕ່າ'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductListInner() {
  const [products, setProducts] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [favIds, setFavIds] = useState(new Set());
  const [cartQty, setCartQty] = useState({}); // { product_id: จำนวนชิ้นรวมทุกไซส์ }
  const [sizeProduct, setSizeProduct] = useState(null); // สินค้าที่กำลังเลือกไซส์ในป๊อปอัป
  const [sizeBusy, setSizeBusy] = useState(false);
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadProducts();
    loadBanners();
    loadFavoriteIds();
    loadCartQty();
  }, []);

  function showToast(msg, ms = 1800) {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  }

  async function loadProducts() {
    setLoadError(false);
    try {
      const { ok, data } = await apiGet('/api/products');
      if (ok && Array.isArray(data)) {
        setProducts(data);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  }

  async function loadBanners() {
    try {
      const { ok, data } = await apiGet('/api/banners');
      if (ok && Array.isArray(data)) setBanners(data);
    } catch (err) {
      // ບໍ່ມີແບນເນີ ກໍບໍ່ເປັນຫຍັງ
    }
  }

  async function loadFavoriteIds() {
    try {
      const { ok, data } = await apiGet('/api/favorites/ids');
      if (ok && Array.isArray(data)) setFavIds(new Set(data));
    } catch (err) {
      // ບໍ່ login ຫຼື error — ປ່ອຍເປັນຫວ່າງ
    }
  }

  // ດຶງກະຕ່າ ແລ້ວລວມຈຳນວນຊິ້ນຕໍ່ສິນຄ້າ (ທຸກໄຊສ໌ລວມກັນ)
  async function loadCartQty() {
    try {
      const { ok, data } = await apiGet('/api/cart');
      if (ok && data && Array.isArray(data.items)) {
        const map = {};
        data.items.forEach((i) => {
          map[i.product_id] = (map[i.product_id] || 0) + i.quantity;
        });
        setCartQty(map);
      }
    } catch (err) {
      // ບໍ່ login ຫຼື error — ບໍ່ສະແດງຕົວເລກ
    }
  }

  async function toggleFavorite(e, productId) {
    e.stopPropagation();
    const isFav = favIds.has(productId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(productId);
      else next.add(productId);
      return next;
    });
    try {
      if (isFav) await apiDelete(`/api/favorites/${productId}`);
      else await apiPost(`/api/favorites/${productId}`, {});
    } catch (err) {
      console.error(err);
    }
  }

  async function addToCart(product) {
    // ສິນຄ້າທີ່ຕ້ອງເລືອກໄຊສ໌ → ເປີດປ໊ອບອັບເລືອກໄຊສ໌
    if ((product.size_options || []).length > 0) {
      setSizeProduct(product);
      return;
    }
    setBusyId(product.id);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (ok) {
        showToast('ເພີ່ມລົງກະຕ່າແລ້ວ', 1500);
        refreshCartCount();
        loadCartQty();
      } else {
        showToast(data.error || 'ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ', 2000);
      }
    } catch (err) {
      console.error(err);
      showToast('ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ', 2000);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSizeAdd(size, quantity) {
    if (!sizeProduct) return;
    setSizeBusy(true);
    try {
      const { ok, data } = await apiPost('/api/cart', {
        product_id: sizeProduct.id,
        quantity,
        size,
      });
      if (ok) {
        setSizeProduct(null);
        showToast('ເພີ່ມລົງກະຕ່າແລ້ວ', 1500);
        refreshCartCount();
        loadCartQty();
      } else {
        showToast((data && data.error) || 'ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ', 2200);
      }
    } catch (err) {
      console.error(err);
      showToast('ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ', 2200);
    } finally {
      setSizeBusy(false);
    }
  }

  async function buyNow(product) {
    // ສິນຄ້າທີ່ຕ້ອງເລືອກໄຊສ໌ → ພາໄປໜ້າລາຍລະອຽດເພື່ອເລືອກໄຊສ໌ກ່ອນ
    if ((product.size_options || []).length > 0) {
      navigate(`/menu/product/${product.id}`);
      return;
    }
    setBusyId(product.id);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (!ok) {
        showToast(data.error || 'ເພີ່ມສິນຄ້າບໍ່ສຳເລັດ', 2000);
        return;
      }
      refreshCartCount();
      navigate('/menu/checkout');
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  const categories = products
    ? Array.from(new Set(products.map((p) => (p.category || '').trim()).filter(Boolean)))
    : [];
  const currentCategory = categories.includes(activeCategory) ? activeCategory : '';

  const keyword = search.trim().toLowerCase();

  const filteredProducts = products
    ? products.filter((p) => {
        if (currentCategory && (p.category || '').trim() !== currentCategory) return false;
        if (keyword && !(p.name || '').toLowerCase().includes(keyword)) return false;
        return true;
      })
    : null;

  const headingText = keyword
    ? `ຜົນການຄົ້ນຫາ (${filteredProducts ? filteredProducts.length : 0})`
    : currentCategory
      ? `${currentCategory} (${filteredProducts ? filteredProducts.length : 0})`
      : 'ສິນຄ້າທັງໝົດ';

  return (
    <div className="customer-shell">
      <style>{extraCss}</style>

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 300
        }}>
          {toast}
        </div>
      )}

      <TopBar search={search} onSearch={setSearch} />

      {/* ແບນເນີ — ເຊື່ອງເວລາກຳລັງຄົ້ນຫາ */}
      {!keyword && <HomeHero banners={banners} />}

      <main style={{ paddingBottom: 24 }}>
        {products === null && !loadError && (
          <p style={{ padding: 20, color: '#ccc' }}>ກຳລັງໂຫລດ...</p>
        )}
        {loadError && (
          <div style={{ padding: 20, color: '#ccc' }}>
            <p>ໂຫລດຂໍ້ມູນສິນຄ້າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່</p>
            <button onClick={loadProducts}>ລອງໃໝ່</button>
          </div>
        )}
        {products && products.length === 0 && (
          <p style={{ padding: 20, color: '#ccc' }}>ຍັງບໍ່ມີສິນຄ້າ</p>
        )}

        {products && products.length > 0 && (
          <section className="hm-section">
            <div className="hm-section-head">
              <h2 className="hm-section-title">{headingText}</h2>
              <CategoryBar
                products={products}
                selected={currentCategory}
                onSelect={setActiveCategory}
              />
            </div>

            {filteredProducts.length === 0 ? (
              <p style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ
              </p>
            ) : (
              <div className="hm-grid">
                {filteredProducts.map((p) => (
                  <MiniCard
                    key={p.id}
                    p={p}
                    isFav={favIds.has(p.id)}
                    busy={busyId === p.id}
                    cartCount={cartQty[p.id] || 0}
                    onOpen={(id) => navigate(`/menu/product/${id}`)}
                    onFav={toggleFavorite}
                    onCart={addToCart}
                    onBuy={buyNow}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {sizeProduct && (
        <SizeModal
          key={sizeProduct.id}
          product={sizeProduct}
          inCart={cartQty[sizeProduct.id] || 0}
          busy={sizeBusy}
          onCancel={() => setSizeProduct(null)}
          onConfirm={confirmSizeAdd}
        />
      )}
    </div>
  );
}

export default function ProductList() {
  return (
    <CartProvider>
      <ProductListInner />
    </CartProvider>
  );
}