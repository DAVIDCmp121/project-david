import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../components/CustomerHeader.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost } from '../../api';

function ProductListInner() {
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadProducts();
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

  async function addToCart(product) {
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

  return (
    <div className="customer-shell">
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

      <main style={{ paddingBottom: 80 }}>
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
          <div className="product-grid">
            {products.map((p) => (
              <div className="product-card" key={p.id}>
                {p.image && <img src={`${API_BASE}${p.image}`} className="product-img" alt={p.name} />}
                <h3>{p.name}</h3>
                <p>ໄຊສ໌: {p.size} | ສີ: {p.color}</p>
                <p>ເຫຼືອ: {p.stock} ອັນ</p>
                <p className="price">{p.price} ກີບ</p>
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