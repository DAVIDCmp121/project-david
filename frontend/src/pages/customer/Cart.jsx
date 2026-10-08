import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPut, apiDelete } from '../../api.js';

const css = `
.ct-wrap { max-width: 900px; margin: 0 auto; padding: 20px 16px 0; }
.ct-title { margin: 0 0 16px; font-size: 1.3rem; font-weight: 700; color: var(--cust-text, #1f2937); }
.ct-list { display: flex; flex-direction: column; gap: 12px; }
.ct-item {
  display: flex; gap: 14px; align-items: center; background: #fff;
  border: 1px solid var(--cust-border, #ececec); border-radius: 14px; padding: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.ct-img { width: 84px; height: 84px; border-radius: 10px; object-fit: cover; background: #f4f4f2; flex: 0 0 auto; }
.ct-info { flex: 1 1 auto; min-width: 0; }
.ct-name { font-size: 0.98rem; font-weight: 600; color: var(--cust-text, #1f2937); line-height: 1.3; }
.ct-meta { font-size: 0.8rem; color: var(--cust-text-muted, #6b7280); margin-top: 3px; }
.ct-price { font-size: 0.95rem; font-weight: 700; color: #b8862b; margin-top: 6px; }
.ct-right { display: flex; align-items: center; gap: 16px; flex: 0 0 auto; }
.ct-qty { display: flex; align-items: center; gap: 10px; }
.ct-qty button {
  width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d1d5db; background: #fff;
  font-size: 17px; line-height: 1; padding: 0; cursor: pointer; color: var(--cust-text, #1f2937);
}
.ct-qty button:hover:not(:disabled) { border-color: var(--gold); color: #b8862b; }
.ct-qty button:disabled { opacity: 0.35; cursor: not-allowed; }
.ct-qty span { min-width: 22px; text-align: center; font-weight: 700; }
.ct-line { min-width: 96px; text-align: right; font-weight: 700; color: var(--cust-text, #1f2937); }
.ct-del {
  padding: 6px 14px; border-radius: 8px; border: 1px solid #fca5a5; background: #fff;
  color: #dc2626; font-size: 0.85rem; font-weight: 600; cursor: pointer;
}
.ct-del:hover:not(:disabled) { background: #dc2626; border-color: #dc2626; color: #fff; }
.ct-del:disabled { opacity: 0.5; cursor: not-allowed; }

.ct-empty { text-align: center; padding: 50px 16px; color: var(--cust-text-muted, #6b7280); }
.ct-empty button, .ct-retry {
  margin-top: 12px; padding: 10px 22px; border-radius: 10px; border: 1px solid var(--gold);
  background: #fff; color: #b8862b; font-weight: 700; cursor: pointer;
}

.ct-bar-space { height: 24px; }
.ct-bar {
  position: sticky; bottom: 0; z-index: 40; background: #fff;
  border-top: 1px solid var(--cust-border, #ececec); box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.08);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
}
.ct-bar-inner {
  max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 14px;
}
.ct-total-label { font-size: 0.82rem; color: var(--cust-text-muted, #6b7280); }
.ct-total { font-size: 1.25rem; font-weight: 800; color: #b8862b; }
.ct-pay {
  padding: 13px 30px; border-radius: 12px; border: none; background: var(--gold); color: #fff;
  font-weight: 700; font-size: 1rem; cursor: pointer; box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.ct-pay:hover { filter: brightness(1.06); }

@media (max-width: 640px) {
  .ct-item { flex-wrap: wrap; }
  .ct-img { width: 72px; height: 72px; }
  .ct-info { flex: 1 1 calc(100% - 100px); }
  .ct-right { width: 100%; justify-content: space-between; gap: 10px; }
  .ct-line { min-width: 0; flex: 1; }
}
`;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

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

  // ຈຳນວນສູງສຸດຂອງແຖວນີ້ = ສະຕັອກ − ຈຳນວນຂອງແຖວອື່ນທີ່ເປັນສິນຄ້າດຽວກັນ (ຄົນລະໄຊສ໌)
  function maxQtyFor(item) {
    const others = (items || [])
      .filter((i) => i.product_id === item.product_id && i.id !== item.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    return Math.max(1, item.stock - others);
  }

  async function changeQty(item, newQty) {
    if (newQty < 1) return;
    if (newQty > maxQtyFor(item)) return;
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
  const hasItems = items && items.length > 0;

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <main className="ct-wrap">
        <h2 className="ct-title">ກະຕ່າສິນຄ້າ</h2>

        {items === null && !loadError && (
          <p style={{ color: 'var(--cust-text-muted, #6b7280)' }}>ກຳລັງໂຫລດ...</p>
        )}

        {loadError && (
          <div className="ct-empty">
            <p>ໂຫລດຂໍ້ມູນກະຕ່າບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່</p>
            <button className="ct-retry" onClick={loadCart}>ລອງໃໝ່</button>
          </div>
        )}

        {items && items.length === 0 && (
          <div className="ct-empty">
            <p>ກະຕ່າວ່າງເປົ່າ</p>
            <button onClick={() => navigate('/menu')}>ກັບໄປໜ້າສິນຄ້າ</button>
          </div>
        )}

        {hasItems && (
          <div className="ct-list">
            {items.map((item) => (
              <div className="ct-item" key={item.id}>
                {item.image && (
                  <img className="ct-img" src={`${API_BASE}${item.image}`} alt={item.name} />
                )}
                <div className="ct-info">
                  <div className="ct-name">{item.name}</div>
                  <div className="ct-meta">
                    ໄຊສ໌: {item.chosen_size || item.size} | ສີ: {item.color}
                  </div>
                  <div className="ct-price">{fmt(item.price)} ກີບ</div>
                </div>

                <div className="ct-right">
                  <div className="ct-qty">
                    <button
                      disabled={busyId === item.id || item.quantity <= 1}
                      onClick={() => changeQty(item, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      disabled={busyId === item.id || item.quantity >= maxQtyFor(item)}
                      onClick={() => changeQty(item, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="ct-line">{fmt(item.price * item.quantity)} ກີບ</div>
                  <button className="ct-del" disabled={busyId === item.id} onClick={() => removeItem(item)}>
                    ລົບ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ct-bar-space" />
      </main>

      {hasItems && (
        <div className="ct-bar">
          <div className="ct-bar-inner">
            <div>
              <div className="ct-total-label">ລວມທັງໝົດ</div>
              <div className="ct-total">{fmt(total)} ກີບ</div>
            </div>
            <button className="ct-pay" onClick={goCheckout}>ຊຳລະເງິນ</button>
          </div>
        </div>
      )}
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