import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../components/CustomerHeader.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import HomeHero from '../../components/HomeHero.jsx';
import CategoryBar from '../../components/CategoryBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { ImageBadges, PriceBlock } from '../../components/ProductBadges.jsx';
import '../../styles/home.css';

const toolbarCss = `
.pl-toolbar { display: flex; align-items: center; gap: 12px; max-width: 1100px; margin: 0 auto; padding: 14px 12px 4px; }
.pl-search { position: relative; flex: 1 1 auto; min-width: 0; }
.pl-cat-dropdown { position: relative; flex: 0 0 auto; }
.pl-cat-btn {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid #e5e7eb; background: #fff; color: #374151; font-size: 13.5px; cursor: pointer;
  white-space: nowrap;
}
.pl-cat-btn.active { border-color: var(--gold); color: #b8862b; background: rgba(212, 165, 72, 0.08); }
.pl-cat-menu {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 20; min-width: 200px;
  max-width: calc(100vw - 24px);
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14); padding: 6px; max-height: 320px; overflow-y: auto;
}
.pl-cat-item {
  display: block; width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px;
  border: none; background: none; color: #374151; font-size: 14px; cursor: pointer;
}
.pl-cat-item:hover { background: #f3f4f6; }
.pl-cat-item.active { background: rgba(212, 165, 72, 0.16); color: #b8862b; font-weight: 600; }
`;

// ---------- การ์ดสินค้า (แบบ Shopee) ----------
function MiniCard({ p, isFav, busy, onOpen, onFav, onCart, onBuy }) {
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
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [favIds, setFavIds] = useState(new Set());
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadProducts();
    loadBanners();
    loadFavoriteIds();
  }, []);

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
    // ສິນຄ້າທີ່ຕ້ອງເລືອກໄຊສ໌ → ພາໄປໜ້າລາຍລະອຽດເພື່ອເລືອກໄຊສ໌ກ່ອນ
    if ((product.size_options || []).length > 0) {
      navigate(`/menu/product/${product.id}`);
      return;
    }
    setBusyId(product.id);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (ok) {
        setToast('ເພີ່ມລົງກະຕ່າແລ້ວ');
        refreshCartCount();
        setTimeout(() => setToast(''), 1500);
      } else {
        setToast(data.error || 'ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ');
        setTimeout(() => setToast(''), 2000);
      }
    } catch (err) {
      console.error(err);
      setToast('ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ');
      setTimeout(() => setToast(''), 2000);
    } finally {
      setBusyId(null);
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
        setToast(data.error || 'ເພີ່ມສິນຄ້າບໍ່ສຳເລັດ');
        setTimeout(() => setToast(''), 2000);
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

  function pickCategory(c) {
    setActiveCategory(c);
    setCatMenuOpen(false);
  }

  const keyword = search.trim().toLowerCase();
  const isFiltering = !!keyword || !!currentCategory;

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
      <style>{toolbarCss}</style>

      <header className="customer-header">
        <div className="header-top">
          <div>
            <h1>POLO SHOP</h1>
            <p>ເລືອກຊື້ເສື້ອຜ້າສະໄຕລ໌ທັນສະໄໝ ຄຸນະພາບດີ</p>
          </div>
          <CustomerHeader />
        </div>
      </header>

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: '#fff', padding: '8px 16px', borderRadius: 6, zIndex: 100
        }}>
          {toast}
        </div>
      )}

      {/* ແຖບຄົ້ນຫາ (ປຸ່ມໝວດຢູ່ແຖວຫົວຂໍ້ສິນຄ້າດ້ານລຸ່ມ) */}
      <div className="pl-toolbar">
        <div className="pl-search">
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ຄົ້ນຫາສິນຄ້າ..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '11px 42px 11px 42px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#1f2937',
              fontSize: 15,
              outline: 'none',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="ລ້າງ"
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: '#f3f4f6', color: '#6b7280', cursor: 'pointer',
                fontSize: 16, lineHeight: 1, padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ແບນເນີ — ເຊື່ອງເວລາກຳລັງຄົ້ນຫາ/ກອງໝວດ */}
      {!keyword && <HomeHero banners={banners} />}

      <main style={{ paddingBottom: 110 }}>
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

      <BottomNav />
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