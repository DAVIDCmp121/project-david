import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../components/CustomerHeader.jsx';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPut, apiDelete } from '../../api.js';

function CartInner() {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    setLoadError(false);
    try {
      const { ok, data } = await apiGet('/api/cart');
      if (ok && Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  }

  async function changeQty(item, newQty) {
    if (newQty < 1) return;
    if (newQty > item.stock) return;
    setBusyId(item.id);
    try {
      const { ok } = await apiPut(`/api/cart/${item.id}`, { quantity: newQty });
      if (ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
        refreshCartCount();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item) {
    setBusyId(item.id);
    try {
      const { ok } = await apiDelete(`/api/cart/${item.id}`);
      if (ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        refreshCartCount();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  function goCheckout() {
    navigate('/menu/checkout');
  }

  const total = items ? items.reduce((sum, i) => sum + i.price * i.quantity, 0) : 0;

  return (
    <div className="customer-shell">
      <header className="customer-header">
        <div className="header-top">
          <div>
            <h1>ກະຕ່າສິນຄ້າ</h1>
          </div>
          <CustomerHeader />
        </div>
      </header>

      <main style={{ padding: 20, paddingBottom: 80 }}>
        {items === null && !loadError && (
          <p style={{ color: '#ccc' }}>ກຳລັງໂຫລດ...</p>
        )}
        {loadError && (
          <div style={{ color: '#ccc' }}>
            <p>ໂຫລດຂໍ້ມູນກະຕ່າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່</p>
            <button onClick={loadCart}>ລອງໃໝ່</button>
          </div>
        )}
        {items && items.length === 0 && (
          <div style={{ color: '#ccc' }}>
            <p>ກະຕ່າວ່າງເປົ່າ</p>
            <button onClick={() => navigate('/menu')}>ກັບໄປໜ້າສິນຄ້າ</button>
          </div>
        )}
        {items && items.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    border: '1px solid #444', borderRadius: 8, padding: 12
                  }}
                >
                  {item.image && (
                    <img
                      src={`${API_BASE}${item.image}`}
                      alt={item.name}
                      style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div>{item.name}</div>
                    <div style={{ color: '#999', fontSize: 13 }}>ໄຊສ໌: {item.size} | ສີ: {item.color}</div>
                    <div className="price">{item.price} ກີບ</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      disabled={busyId === item.id || item.quantity <= 1}
                      onClick={() => changeQty(item, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      disabled={busyId === item.id || item.quantity >= item.stock}
                      onClick={() => changeQty(item, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ minWidth: 90, textAlign: 'right' }}>
                    {item.price * item.quantity} ກີບ
                  </div>
                  <button disabled={busyId === item.id} onClick={() => removeItem(item)}>
                    ລົບ
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <div style={{ fontSize: 18, marginBottom: 12 }}>
                ລວມທັງໝົດ: <strong>{total} ກີບ</strong>
              </div>
              <button onClick={goCheckout} style={{ padding: '10px 24px', fontSize: 16 }}>
                ຊຳລະເງິນ
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function Cart() {
  return (
    <CartProvider>
      <CartInner />
    </CartProvider>
  );
}