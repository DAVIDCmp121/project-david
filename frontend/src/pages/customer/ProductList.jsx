import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../components/CustomerHeader.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { ImageBadges, PriceBlock } from '../../components/ProductBadges.jsx';

const toolbarCss = `
.pl-toolbar { display: flex; align-items: center; gap: 12px; max-width: 980px; margin: 0 auto; padding: 14px 16px 4px; }
.pl-search { position: relative; flex: 0 1 380px; min-width: 220px; }
.pl-cats { flex: 1 1 0; min-width: 0; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding: 2px 0; }
.pl-cats::-webkit-scrollbar { display: none; }
.pl-cat {
  flex: 0 0 auto; padding: 8px 16px; border-radius: 999px; border: 1px solid #e5e7eb;
  background: #fff; color: #6b7280; font-size: 14px; white-space: nowrap; cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.pl-cat.active { background: rgba(212, 165, 72, 0.16); border-color: var(--gold); color: #b8862b; font-weight: 600; }
@media (max-width: 720px) {
  .pl-toolbar { flex-direction: column; align-items: stretch; gap: 10px; }
  .pl-search { flex: 0 0 auto; min-width: 0; width: 100%; }
  .pl-cats { flex: 0 0 auto; width: 100%; }
}
`;

function ProductListInner() {
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [favIds, setFavIds] = useState(new Set());
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadProducts();
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

  // ✅ ໃໝ: ດງ id ສນຄ້າທຖືກໃຈໄວ (ຖາຍງບ login ຈະ error ບເປນຫຍງ ປອຍເປນ set ຫວາງ)
  async function loadFavoriteIds() {
    try {
      const { ok, data } = await apiGet('/api/favorites/ids');
      if (ok && Array.isArray(data)) setFavIds(new Set(data));
    } catch (err) {
      // ບ login ຫ error — ປອຍເປນຫວາງ
    }
  }

  // ✅ ໃໝ່: ກດ/ຍກເລກຫວໃຈ
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
    setBusyId(product.id);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (ok) {
        setToast('ເພມລງກະຕາແລວ');
        refreshCartCount();
        setTimeout(() => setToast(''), 1500);
      } else {
        setToast(data.error || 'ເພມລງກະຕ່າບສເລດ');
        setTimeout(() => setToast(''), 2000);
      }
    } catch (err) {
      console.error(err);
      setToast('ເພມລງກະຕ່າບສເລດ');
      setTimeout(() => setToast(''), 2000);
    } finally {
      setBusyId(null);
    }
  }

  async function buyNow(product) {
    setBusyId(product.id);
    try {
      const { ok, data } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (!ok) {
        setToast(data.error || 'ເພມສນຄ້າບສເລດ');
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

  const keyword = search.trim().toLowerCase();
  const filteredProducts = products
    ? products.filter((p) => {
        if (currentCategory && (p.category || '').trim() !== currentCategory) return false;
        if (keyword && !(p.name || '').toLowerCase().includes(keyword)) return false;
        return true;
      })
    : null;

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

        {categories.length > 0 && (
          <div className="pl-cats">
            <button
              className={`pl-cat ${currentCategory === '' ? 'active' : ''}`}
              onClick={() => setActiveCategory('')}
            >
              ທັງໝົດ
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`pl-cat ${currentCategory === c ? 'active' : ''}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

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
        {products && products.length > 0 && filteredProducts.length === 0 && (
          <p style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
            ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ
          </p>
        )}
        {filteredProducts && filteredProducts.length > 0 && (
          <div className="product-grid">
            {filteredProducts.map((p) => (
              <div className="product-card" key={p.id}>
                <div style={{ position: 'relative' }}>
                  <ImageBadges product={p} />
                  <div
                    onClick={() => navigate(`/menu/product/${p.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {p.image && <img src={`${API_BASE}${p.image}`} className="product-img" alt={p.name} />}
                    <h3>{p.name}</h3>
                    <p>ໄຊສ໌: {p.size} | ສີ: {p.color}</p>
                    <p>ເຫຼືອ: {p.stock} ອັນ</p>
                    <PriceBlock product={p} />
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(e, p.id)}
                    aria-label="ຖືກໃຈ"
                    style={{
                      position: 'absolute', top: 8, right: 8, width: 34, height: 34,
                      borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    <svg
                      width="18" height="18" viewBox="0 0 24 24"
                      fill={favIds.has(p.id) ? '#e53935' : 'none'}
                      stroke={favIds.has(p.id) ? '#e53935' : '#9ca3af'}
                      strokeWidth="2"
                    >
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
                    </svg>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={p.stock <= 0 || busyId === p.id}
                    onClick={() => buyNow(p)}
                    style={{ flex: 1 }}
                  >
                    {p.stock <= 0 ? 'ສິນຄ້າໝົດ' : (busyId === p.id ? '...' : 'ຊື້ເລີຍ')}
                  </button>
                  <button
                    disabled={p.stock <= 0 || busyId === p.id}
                    onClick={() => addToCart(p)}
                    title="ເພີ່ມລົງກະຕ່າ"
                    style={{
                      width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 6, border: '1px solid #666', background: 'none', cursor: 'pointer', flexShrink: 0
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
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