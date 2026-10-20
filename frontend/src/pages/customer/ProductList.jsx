import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import HomeHero from '../../components/HomeHero.jsx';
import CategoryBar from '../../components/CategoryBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { ImageBadges, PriceBlock } from '../../components/ProductBadges.jsx';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-home.js';
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

/* ---------- ป้ายใกล้หมด (มุมล่างซ้ายของรูป) ---------- */
.hm-low {
  position: absolute; left: 8px; bottom: 8px; z-index: 2;
  background: #f97316; color: #fff; font-size: 11px; font-weight: 700; line-height: 1;
  padding: 4px 9px; border-radius: 999px; pointer-events: none;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.35);
}

/* ---------- ดาวคะแนนรีวิวใต้ชื่อสินค้า (เว้นความสูงไว้เสมอ ให้การ์ดเรียงตรงกัน) ---------- */
.hm-rating {
  display: flex; align-items: center; gap: 4px; height: 18px; margin: 0 0 2px;
  font-size: 0.76rem; color: var(--cust-text-muted, #6b7280); white-space: nowrap; overflow: hidden;
}
.hm-rating svg { flex: 0 0 auto; }
.hm-rating b { color: var(--cust-text, #1f2937); font-weight: 700; }

/* ---------- แถบเรียงลำดับ / ตัวกรอง ---------- */
.hm-toolbar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 0 12px;
}
.hm-sort { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--cust-text-muted, #6b7280); }
.hm-sort select {
  height: 34px; padding: 0 10px; border-radius: 999px;
  border: 1px solid var(--cust-border, #e5e7eb); background: #fff;
  color: var(--cust-text, #1f2937); font-size: 0.82rem; cursor: pointer; max-width: 190px;
}
.hm-chip {
  height: 34px; padding: 0 14px; border-radius: 999px;
  border: 1px solid var(--cust-border, #e5e7eb); background: #fff;
  color: var(--cust-text, #1f2937); font-size: 0.82rem; cursor: pointer; white-space: nowrap;
}
.hm-chip:hover { border-color: var(--gold); }
.hm-chip.active { background: var(--gold); border-color: var(--gold); color: #fff; font-weight: 700; }

:root[data-theme='dark'] .hm-sort select,
:root[data-theme='dark'] .hm-chip {
  background: #1c1c20; border-color: rgba(255, 255, 255, 0.1); color: #e4e4e7;
}
:root[data-theme='dark'] .hm-chip:hover { border-color: rgba(201, 162, 39, 0.6); }
:root[data-theme='dark'] .hm-chip.active {
  background: linear-gradient(135deg, #f0d77a, #c9a227); border-color: transparent; color: #1c1505;
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

const LOW_STOCK = 5; // เหลือไม่เกินนี้ = ขึ้นป้าย "ใกล้หมด"

// สต็อกรวมของสินค้า: ถ้ามี variants ให้รวมจากไซส์ที่เปิดขาย ไม่งั้นใช้ products.stock
function totalStock(p) {
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + (Number(v.stock_qty) || 0), 0);
  }
  return Number(p.stock) || 0;
}

function sortProducts(list, key) {
  const arr = [...list];
  const price = (p) => Number(p.final_price != null ? p.final_price : p.price) || 0;
  if (key === 'newest') arr.sort((a, b) => b.id - a.id);
  else if (key === 'best') arr.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0) || b.id - a.id);
  else if (key === 'priceAsc') arr.sort((a, b) => price(a) - price(b));
  else if (key === 'priceDesc') arr.sort((a, b) => price(b) - price(a));
  return arr; // 'default' = ลำดับที่แอดมินจัดไว้
}

// ---------- การ์ดสินค้า (แบบ Shopee) ----------
function MiniCard({ p, rating, isFav, busy, cartCount, onOpen, onFav, onCart, onBuy }) {
  const { t } = usePageT(dict);
  const stock = totalStock(p);
  const soldOut = stock <= 0;
  const lowStock = !soldOut && stock <= LOW_STOCK;
  const sizeText = `${t('common.size')}: ${p.size || '-'}`;
  const colorText = `${t('common.color')}: ${p.color || '-'}`;
  const hasRating = !!rating && Number(rating.count) > 0;

  return (
    <div className="hm-card" onClick={() => onOpen(p.id)}>
      <div className="hm-card-img">
        <ImageBadges product={p} />
        {p.image && <img src={`${API_BASE}${p.image}`} alt={p.name} />}
        {soldOut && <div className="hm-soldout">{t('common.soldOut')}</div>}
        {lowStock && <span className="hm-low">{t('ch.lowStock')}</span>}
        <button className="hm-fav" aria-label={t('common.favorite')} onClick={(e) => onFav(e, p.id)}>
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

        {/* ດາວຄະແນນ — ສະແດງສະເພາະສິນຄ້າທີ່ມີຣີວິວ (ແຕ່ເວັ້ນຄວາມສູງໄວ້ສະເໝີ) */}
        <div className="hm-rating">
          {hasRating && (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
                <polygon
                  points="12,2 15,9 22,9.3 16.5,14 18.2,21 12,17 5.8,21 7.5,14 2,9.3 9,9"
                  fill="var(--gold)"
                  stroke="var(--gold)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <b>{Number(rating.average).toFixed(1)}</b>
              <span>({rating.count})</span>
            </>
          )}
        </div>

        <div className="hm-meta" title={sizeText}>{sizeText}</div>
        <div className="hm-meta" title={colorText}>{colorText}</div>

        <div className="hm-price-slot">
          <PriceBlock product={p} />
        </div>

        <div className="hm-stockrow">
          <span>{t('common.stockLeft', { n: stock })}</span>
          <span>{p.sold_count > 0 ? t('ch.sold', { n: p.sold_count }) : ''}</span>
        </div>

        <div className="hm-actions">
          <button
            className="hm-buy"
            disabled={soldOut || busy}
            onClick={(e) => { e.stopPropagation(); onBuy(p); }}
          >
            {soldOut ? t('common.soldOut') : (busy ? '...' : t('common.buyNow'))}
          </button>
          <button
            className="hm-cart"
            title={t('common.addToCart')}
            aria-label={t('common.addToCart')}
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
  const { t } = usePageT(dict);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);

  const options = product.size_options || [];
  const stock = totalStock(product);
  const maxQty = Math.max(0, stock - inCart);

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
              {t('common.stockLeft', { n: stock })}
              {inCart > 0 ? ` · ${t('ch.inCart', { n: inCart })}` : ''}
            </div>
          </div>
        </div>

        <div className="sz-title">
          {t('ch.chooseSize')}{size && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>: {size}</span>}
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
        {error && <div className="sz-err">{t('ch.pickSizeFirst')}</div>}

        <div className="sz-qty-row">
          <span className="sz-title" style={{ margin: 0 }}>{t('common.quantity')}</span>
          <div className="sz-qty">
            <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
          </div>
        </div>
        {maxQty <= 0 && <div className="sz-err">{t('ch.cartFull')}</div>}

        <div className="sz-actions">
          <button type="button" className="sz-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="sz-confirm" disabled={busy || maxQty <= 0} onClick={submit}>
            {busy ? '...' : t('ch.addBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductListInner() {
  const { t } = usePageT(dict);
  const [products, setProducts] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [sortKey, setSortKey] = useState('default');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);
  const [favIds, setFavIds] = useState(new Set());
  const [cartQty, setCartQty] = useState({}); // { product_id: จำนวนชิ้นรวมทุกไซส์ }
  const [ratings, setRatings] = useState({}); // { product_id: { average, count } } คะแนนรีวิว
  const [sizeProduct, setSizeProduct] = useState(null); // สินค้าที่กำลังเลือกไซส์ในป๊อปอัป
  const [sizeBusy, setSizeBusy] = useState(false);
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadProducts();
    loadBanners();
    loadFavoriteIds();
    loadCartQty();
    loadRatings();
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

  // ດຶງຄະແນນຣີວິວຂອງທຸກສິນຄ້າ (ຄັ້ງດຽວ) ເພື່ອສະແດງດາວໃນການ໌ດ
  async function loadRatings() {
    try {
      const { ok, data } = await apiGet('/api/reviews/summary');
      if (ok && data && data.summary) setRatings(data.summary);
    } catch (err) {
      // ດຶງບໍ່ໄດ້ ກໍບໍ່ສະແດງດາວ ບໍ່ກະທົບສ່ວນອື່ນ
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
      const { ok } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (ok) {
        showToast(t('common.addedToCart'), 1500);
        refreshCartCount();
        loadCartQty();
      } else {
        showToast(t('common.addFail'), 2000);
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.addFail'), 2000);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSizeAdd(size, quantity) {
    if (!sizeProduct) return;
    setSizeBusy(true);
    try {
      const { ok } = await apiPost('/api/cart', {
        product_id: sizeProduct.id,
        quantity,
        size,
      });
      if (ok) {
        setSizeProduct(null);
        showToast(t('common.addedToCart'), 1500);
        refreshCartCount();
        loadCartQty();
      } else {
        showToast(t('common.addFail'), 2200);
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.addFail'), 2200);
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
      const { ok } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (!ok) {
        showToast(t('ch.buyFail'), 2000);
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

  let filteredProducts = null;
  if (products) {
    filteredProducts = products.filter((p) => {
      if (currentCategory && (p.category || '').trim() !== currentCategory) return false;
      if (keyword && !(p.name || '').toLowerCase().includes(keyword)) return false;
      if (onlyPromo && !p.is_promo) return false;
      if (onlyStock && totalStock(p) <= 0) return false;
      return true;
    });
    filteredProducts = sortProducts(filteredProducts, sortKey);
  }

  const headingText = keyword
    ? t('ch.searchResult', { n: filteredProducts ? filteredProducts.length : 0 })
    : currentCategory
      ? `${currentCategory} (${filteredProducts ? filteredProducts.length : 0})`
      : t('ch.allProducts');

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
          <p style={{ padding: 20, color: 'var(--cust-text-muted, #6b7280)' }}>{t('common.loading')}</p>
        )}
        {loadError && (
          <div style={{ padding: 20, color: 'var(--cust-text-muted, #6b7280)' }}>
            <p>{t('ch.loadFail')}</p>
            <button onClick={loadProducts}>{t('common.retry')}</button>
          </div>
        )}
        {products && products.length === 0 && (
          <p style={{ padding: 20, color: 'var(--cust-text-muted, #6b7280)' }}>{t('ch.empty')}</p>
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

            <div className="hm-toolbar">
              <label className="hm-sort">
                <span>{t('ch.sortLabel')}</span>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="default">{t('ch.sortDefault')}</option>
                  <option value="newest">{t('ch.sortNewest')}</option>
                  <option value="best">{t('ch.sortBest')}</option>
                  <option value="priceAsc">{t('ch.sortPriceAsc')}</option>
                  <option value="priceDesc">{t('ch.sortPriceDesc')}</option>
                </select>
              </label>
              <button
                type="button"
                className={`hm-chip${onlyPromo ? ' active' : ''}`}
                onClick={() => setOnlyPromo((v) => !v)}
              >
                {t('ch.onlyPromo')}
              </button>
              <button
                type="button"
                className={`hm-chip${onlyStock ? ' active' : ''}`}
                onClick={() => setOnlyStock((v) => !v)}
              >
                {t('ch.onlyInStock')}
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <p style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                {t('ch.noResult')}
              </p>
            ) : (
              <div className="hm-grid">
                {filteredProducts.map((p) => (
                  <MiniCard
                    key={p.id}
                    p={p}
                    rating={ratings[p.id]}
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