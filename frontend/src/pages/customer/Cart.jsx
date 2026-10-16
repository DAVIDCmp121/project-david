import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPut, apiDelete } from '../../api.js';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-cart.js';

// คีย์ที่ใช้ส่งต่อคูปองที่เลือกจากตะกร้า ไปหน้าชำระเงิน (ต้องตรงกับ Checkout.jsx)
const COUPON_KEY = 'polo_coupon_key';

const css = `
.ct-wrap { max-width: 900px; margin: 0 auto; padding: 20px 16px 0; }
.ct-title { margin: 0 0 16px; font-size: 1.3rem; font-weight: 700; color: var(--cust-text, #1f2937); }
.ct-list { display: flex; flex-direction: column; gap: 12px; }
.ct-item {
  display: flex; gap: 14px; align-items: center; background: #fff;
  border: 1px solid var(--cust-border, #ececec); border-radius: 14px; padding: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.ct-item.ct-bad { border-color: #fca5a5; background: #fffafa; }
.ct-img { width: 84px; height: 84px; border-radius: 10px; object-fit: cover; background: #f4f4f2; flex: 0 0 auto; }
.ct-info { flex: 1 1 auto; min-width: 0; }
.ct-name { font-size: 0.98rem; font-weight: 600; color: var(--cust-text, #1f2937); line-height: 1.3; }
.ct-meta { font-size: 0.8rem; color: var(--cust-text-muted, #6b7280); margin-top: 3px; }
.ct-price { font-size: 0.95rem; font-weight: 700; color: #b8862b; margin-top: 6px; }
.ct-warn { font-size: 0.82rem; color: #dc2626; margin-top: 6px; font-weight: 600; }
.ct-low { font-size: 0.8rem; color: #d97706; margin-top: 4px; }
.ct-adjust {
  margin-top: 6px; padding: 4px 12px; border-radius: 8px; border: 1px solid #dc2626;
  background: #fff; color: #dc2626; font-size: 0.8rem; font-weight: 600; cursor: pointer;
}
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

/* ---------- แถบส่งฟรี ---------- */
.ct-ship {
  background: #fffaf0; border: 1px solid #f1e3b8; border-radius: 14px;
  padding: 12px 14px; margin-bottom: 12px;
}
.ct-ship-text {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.9rem; font-weight: 600; color: #8a6a10; line-height: 1.3;
}
.ct-ship-text svg { flex: 0 0 auto; }
.ct-ship-track {
  margin-top: 8px; height: 8px; border-radius: 999px; background: #f1ece0; overflow: hidden;
}
.ct-ship-fill {
  height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #e8c25a, #c9a227);
  transition: width 0.4s ease;
}
.ct-ship.done { background: #f0fdf4; border-color: #bbf7d0; }
.ct-ship.done .ct-ship-text { color: #15803d; }
.ct-ship.done .ct-ship-fill { background: linear-gradient(90deg, #4ade80, #22c55e); }

/* ---------- คูปอง ---------- */
.ct-cp { margin-top: 16px; }
.ct-cp-title { font-size: 0.95rem; font-weight: 700; color: var(--cust-text, #1f2937); margin: 0 0 4px; }
.ct-cp-hint { font-size: 0.8rem; color: var(--cust-text-muted, #6b7280); margin-bottom: 10px; }
.ct-cp-item {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
  padding: 11px 14px; margin-bottom: 8px; border: 1.5px solid var(--cust-border, #ececec);
  border-radius: 12px; background: #fff; cursor: pointer; text-align: left;
  font-family: inherit; color: var(--cust-text, #1f2937);
}
.ct-cp-item:hover:not(:disabled) { border-color: var(--gold); }
.ct-cp-item.selected {
  border-color: var(--gold); background: #fffaf0; box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15);
}
.ct-cp-item:disabled { opacity: 0.55; cursor: not-allowed; }
.ct-cp-name { font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 8px; }
.ct-cp-count {
  padding: 1px 8px; border-radius: 999px; background: #faf0cf; color: #9a7412;
  font-size: 0.75rem; font-weight: 800;
}
.ct-cp-sub { font-size: 0.78rem; color: var(--cust-text-muted, #6b7280); margin-top: 2px; }
.ct-cp-save { color: #b8862b; font-weight: 800; font-size: 0.92rem; white-space: nowrap; }
.ct-cp-check {
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid #d1d5db; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center; margin-left: 4px;
}
.ct-cp-item.selected .ct-cp-check { border-color: var(--gold); background: var(--gold); color: #fff; }

:root[data-theme='dark'] .ct-ship {
  background: rgba(201, 162, 39, 0.1); border-color: rgba(201, 162, 39, 0.3);
}
:root[data-theme='dark'] .ct-ship-text { color: #e8c25a; }
:root[data-theme='dark'] .ct-ship-track { background: #2a2a30; }
:root[data-theme='dark'] .ct-ship.done {
  background: rgba(34, 197, 94, 0.1); border-color: rgba(74, 222, 128, 0.35);
}
:root[data-theme='dark'] .ct-ship.done .ct-ship-text { color: #4ade80; }
:root[data-theme='dark'] .ct-cp-item {
  background: #1f1f24; border-color: rgba(255, 255, 255, 0.1); color: #e4e4e7;
}
:root[data-theme='dark'] .ct-cp-item:hover:not(:disabled) { border-color: rgba(201, 162, 39, 0.6); }
:root[data-theme='dark'] .ct-cp-item.selected {
  background: rgba(201, 162, 39, 0.16); border-color: #c9a227;
}
:root[data-theme='dark'] .ct-cp-save { color: #e8c25a; }
:root[data-theme='dark'] .ct-cp-count { background: rgba(201, 162, 39, 0.2); color: #e8c25a; }
:root[data-theme='dark'] .ct-bar-save { color: #4ade80; }

.ct-bar-space { height: 24px; }
.ct-bar {
  position: sticky; bottom: 0; z-index: 40; background: #fff;
  border-top: 1px solid var(--cust-border, #ececec); box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.08);
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
}
.ct-bar-inner {
  max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 14px;
}
.ct-bar-note { max-width: 900px; margin: 0 auto 8px; color: #dc2626; font-size: 0.85rem; font-weight: 600; }
.ct-total-label { font-size: 0.82rem; color: var(--cust-text-muted, #6b7280); }
.ct-total { font-size: 1.25rem; font-weight: 800; color: #b8862b; }
.ct-bar-save { font-size: 0.8rem; font-weight: 700; color: #15803d; }
.ct-pay {
  padding: 13px 30px; border-radius: 12px; border: none; background: var(--gold); color: #fff;
  font-weight: 700; font-size: 1rem; cursor: pointer; box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.ct-pay:hover:not(:disabled) { filter: brightness(1.06); }
.ct-pay:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; }

@media (max-width: 640px) {
  .ct-item { flex-wrap: wrap; }
  .ct-img { width: 72px; height: 72px; }
  .ct-info { flex: 1 1 calc(100% - 100px); }
  .ct-right { width: 100%; justify-content: space-between; gap: 10px; }
  .ct-line { min-width: 0; flex: 1; }
}
`;

const LOW_STOCK_SHOW = 3;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

// stock ที่ backend ส่งมา = สต็อกของไซส์ที่เลือกในแถวนั้นอยู่แล้ว
const stockOf = (item) => Number(item.stock) || 0;
const isOver = (item) => item.quantity > stockOf(item);

// คำนวณส่วนลดคูปอง (ใช้แสดงผลเท่านั้น — backend คำนวณจริงตอนสั่งซื้อ)
function calcDiscount(c, subtotal) {
  if (!c || subtotal < c.min_order) return 0;
  let d = c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.type === 'percent' && c.max_discount) d = Math.min(d, c.max_discount);
  return Math.min(d, subtotal);
}

function readSavedCouponKey() {
  try {
    return sessionStorage.getItem(COUPON_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveCouponKey(key) {
  try {
    if (key) sessionStorage.setItem(COUPON_KEY, key);
    else sessionStorage.removeItem(COUPON_KEY);
  } catch (e) {}
}

function TruckIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function CartInner() {
  const [items, setItems] = useState(null);
  const [shipping, setShipping] = useState(null); // { flat_fee, free_min }
  const [coupons, setCoupons] = useState([]);
  const [couponKey, setCouponKey] = useState(readSavedCouponKey);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();
  const { t } = usePageT(dict);

  useEffect(() => {
    loadCart();
    loadCoupons();
  }, []);

  async function loadCart() {
    setLoadError(false);
    try {
      const { ok, data } = await apiGet('/api/cart');
      if (ok && Array.isArray(data.items)) {
        setItems(data.items);
        setShipping(data.shipping || null);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  }

  async function loadCoupons() {
    try {
      const { ok, data } = await apiGet('/api/coupons/me');
      if (ok && data && Array.isArray(data.coupons)) setCoupons(data.coupons);
    } catch (err) {
      // ไม่มีคูปอง/ยังไม่ล็อกอิน — ไม่แสดงส่วนคูปอง
    }
  }

  function pickCoupon(key) {
    const next = couponKey === key ? null : key;
    setCouponKey(next);
    saveCouponKey(next);
  }

  async function changeQty(item, newQty) {
    if (newQty < 1) return;
    // เพิ่มได้ไม่เกินสต็อก (ลดได้เสมอ)
    if (newQty > item.quantity && newQty > stockOf(item)) return;
    setBusyId(item.id);
    try {
      const { ok } = await apiPut(`/api/cart/${item.id}`, { quantity: newQty });
      if (ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)));
        refreshCartCount();
      } else {
        // สต็อกอาจเปลี่ยนไปแล้ว โหลดตะกร้าใหม่ให้ตัวเลขตรงกับความจริง
        await loadCart();
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
  const hasProblem = !!items && items.some(isOver);

  // แถบส่งฟรี: แสดงเมื่อร้านตั้งทั้งค่าส่งและยอดขั้นต่ำส่งฟรีไว้ (คิดจากยอดก่อนหักคูปอง ตรงกับ backend)
  const freeMin = shipping ? Number(shipping.free_min) || 0 : 0;
  const flatFee = shipping ? Number(shipping.flat_fee) || 0 : 0;
  const showShipBar = !!hasItems && freeMin > 0 && flatFee > 0;
  const shipLeft = Math.max(0, freeMin - total);
  const shipPct = freeMin > 0 ? Math.min(100, Math.round((total / freeMin) * 100)) : 0;
  const shipDone = shipLeft === 0;

  // รวมคูปองที่เหมือนกันเป็นกลุ่มเดียว (คีย์ต้องตรงกับ Checkout.jsx)
  const couponGroups = (() => {
    const map = new Map();
    [...coupons]
      .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
      .forEach((c) => {
        const key = [c.name, c.type, c.value, c.min_order, c.max_discount || 0].join('|');
        if (!map.has(key)) map.set(key, { key, rep: c, count: 0 });
        map.get(key).count += 1;
      });
    return [...map.values()];
  })();
  const pickedGroup = couponGroups.find((g) => g.key === couponKey);
  const discount = pickedGroup ? calcDiscount(pickedGroup.rep, total) : 0;
  const payTotal = total - discount;

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <main className="ct-wrap">
        <h2 className="ct-title">{t('cart.title')}</h2>

        {items === null && !loadError && (
          <p style={{ color: 'var(--cust-text-muted, #6b7280)' }}>{t('common.loading')}</p>
        )}

        {loadError && (
          <div className="ct-empty">
            <p>{t('cart.loadFail')}</p>
            <button className="ct-retry" onClick={loadCart}>{t('common.retry')}</button>
          </div>
        )}

        {items && items.length === 0 && (
          <div className="ct-empty">
            <p>{t('cart.empty')}</p>
            <button onClick={() => navigate('/menu')}>{t('cart.backToShop')}</button>
          </div>
        )}

        {showShipBar && (
          <div className={`ct-ship${shipDone ? ' done' : ''}`}>
            <div className="ct-ship-text">
              <TruckIcon />
              <span>
                {shipDone
                  ? t('cart.freeDone')
                  : t('cart.freeLeft', { n: `${fmt(shipLeft)} ${t('common.kip')}` })}
              </span>
            </div>
            <div className="ct-ship-track">
              <div className="ct-ship-fill" style={{ width: `${shipPct}%` }} />
            </div>
          </div>
        )}

        {hasItems && (
          <div className="ct-list">
            {items.map((item) => {
              const stock = stockOf(item);
              const out = stock <= 0;
              const over = isOver(item);
              const low = !over && stock <= LOW_STOCK_SHOW;
              return (
                <div className={`ct-item${over ? ' ct-bad' : ''}`} key={item.id}>
                  {item.image && (
                    <img className="ct-img" src={`${API_BASE}${item.image}`} alt={item.name} />
                  )}
                  <div className="ct-info">
                    <div className="ct-name">{item.name}</div>
                    <div className="ct-meta">
                      {t('common.size')}: {item.chosen_size || item.size} | {t('common.color')}: {item.color}
                    </div>
                    <div className="ct-price">{fmt(item.price)} {t('common.kip')}</div>

                    {out && <div className="ct-warn">{t('cart.out')}</div>}
                    {!out && over && (
                      <>
                        <div className="ct-warn">{t('cart.only', { n: stock })}</div>
                        <button
                          className="ct-adjust"
                          disabled={busyId === item.id}
                          onClick={() => changeQty(item, stock)}
                        >
                          {t('cart.adjust', { n: stock })}
                        </button>
                      </>
                    )}
                    {low && <div className="ct-low">{t('cart.only', { n: stock })}</div>}
                  </div>

                  <div className="ct-right">
                    <div className="ct-qty">
                      <button
                        disabled={busyId === item.id || item.quantity <= 1 || over}
                        onClick={() => changeQty(item, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={busyId === item.id || item.quantity >= stock}
                        onClick={() => changeQty(item, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="ct-line">{fmt(item.price * item.quantity)} {t('common.kip')}</div>
                    <button className="ct-del" disabled={busyId === item.id} onClick={() => removeItem(item)}>
                      {t('cart.remove')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasItems && couponGroups.length > 0 && (
          <div className="ct-cp">
            <h3 className="ct-cp-title">{t('cart.coupon')}</h3>
            <div className="ct-cp-hint">{t('cart.couponTap')}</div>
            {couponGroups.map((g) => {
              const c = g.rep;
              const ok = total >= c.min_order;
              const selected = couponKey === g.key && ok;
              return (
                <button
                  type="button"
                  key={g.key}
                  disabled={!ok}
                  className={`ct-cp-item${selected ? ' selected' : ''}`}
                  onClick={() => pickCoupon(g.key)}
                >
                  <div>
                    <div className="ct-cp-name">
                      {c.name}
                      {g.count > 1 && <span className="ct-cp-count">×{g.count}</span>}
                    </div>
                    <div className="ct-cp-sub">
                      {ok
                        ? t('cart.couponExpires', { date: new Date(c.expires_at).toLocaleDateString('en-GB') })
                        : t('cart.couponMin', { n: `${fmt(c.min_order - total)} ${t('common.kip')}` })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {ok && <span className="ct-cp-save">−{fmt(calcDiscount(c, total))}</span>}
                    <span className="ct-cp-check">{selected ? '✓' : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="ct-bar-space" />
      </main>

      {hasItems && (
        <div className="ct-bar">
          {hasProblem && <div className="ct-bar-note">{t('cart.fixFirst')}</div>}
          <div className="ct-bar-inner">
            <div>
              <div className="ct-total-label">{t('cart.total')}</div>
              <div className="ct-total">{fmt(payTotal)} {t('common.kip')}</div>
              {discount > 0 && (
                <div className="ct-bar-save">{t('cart.discount')} −{fmt(discount)} {t('common.kip')}</div>
              )}
            </div>
            <button className="ct-pay" disabled={hasProblem} onClick={goCheckout}>{t('cart.pay')}</button>
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