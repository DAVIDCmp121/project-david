import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE, apiPost, getAuthHeader } from '../../api.js';
import TopBar from '../../components/TopBar.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-orders-page.js';

// ສີຂອງປ້າຍສະຖານະ (ຂໍ້ຄວາມແປຢູ່ໃນ locales ຄີ od.st.<status>)
const STATUS = {
  awaiting_review: { bg: '#fef3c7', color: '#b45309' },
  confirmed: { bg: '#dbeafe', color: '#1d4ed8' },
  shipped: { bg: '#ede9fe', color: '#6d28d9' },
  delivered: { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280' },
};

// ຂໍ້ຄວາມແປຢູ່ໃນ locales ຄີ od.tab.<key>
const TAB_KEYS = ['all', 'awaiting_review', 'confirmed', 'shipped', 'delivered', 'cancelled'];

// key ຕ້ອງກົງກັບ Checkout.jsx / backend (VALID_CARRIERS)
const CARRIERS = {
  anousith: { name: 'Anousith Express', color: '#c62828' },
  hal: { name: 'HAL Express', color: '#d32f2f' },
  mixay: { name: 'Mixay Express', color: '#b71c1c' },
};

const MAX_ITEMS_COLLAPSED = 3;

const css = `
.od-wrap { max-width: 760px; margin: 0 auto; padding: 20px 16px 32px; }
.od-title { margin: 0 0 14px; font-size: 1.3rem; font-weight: 700; color: var(--cust-text, #1f2937); }

.od-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 12px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.od-tabs::-webkit-scrollbar { display: none; }
.od-tab {
  flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid #e5e7eb; background: #fff; color: #4b5563; font-size: 0.86rem; font-weight: 600;
  cursor: pointer; white-space: nowrap;
}
.od-tab:hover { border-color: var(--gold); }
.od-tab.active { background: var(--gold); border-color: var(--gold); color: #fff; }
.od-tab-count {
  min-width: 20px; height: 20px; padding: 0 6px; box-sizing: border-box; border-radius: 999px;
  background: #f3f4f6; color: #6b7280; font-size: 0.72rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.od-tab.active .od-tab-count { background: rgba(255, 255, 255, 0.3); color: #fff; }

.od-list { display: flex; flex-direction: column; gap: 14px; }
.od-card {
  background: #fff; border: 1px solid var(--cust-border, #ececec); border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04); overflow: hidden;
}
.od-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 16px; background: #faf8f2; border-bottom: 1px solid var(--cust-border, #ececec);
}
.od-date { font-size: 0.92rem; font-weight: 700; color: var(--cust-text, #1f2937); }
.od-sub { font-size: 0.76rem; color: var(--cust-text-muted, #6b7280); margin-top: 2px; }
.od-badge { padding: 5px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; }

.od-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px 0;
}
.od-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px 3px 4px; border-radius: 999px;
  background: #f3f4f6; font-size: 0.8rem; font-weight: 600; color: #374151; white-space: nowrap;
}
.od-clogo { border-radius: 6px; object-fit: cover; background: #f4f4f2; flex: 0 0 auto; }
.od-clogo-fb {
  border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 800; flex: 0 0 auto;
}
.od-pay { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; }
.od-pay.transfer { background: #e0f2fe; color: #0369a1; }
.od-pay.cod { background: #ffedd5; color: #c2410c; }

.od-items { padding: 6px 16px; }
.od-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.od-item + .od-item { border-top: 1px dashed #eee; }
.od-thumb {
  width: 52px; height: 52px; border-radius: 10px; object-fit: cover; flex: 0 0 auto;
  background: #f4f4f2; border: 1px solid #eee;
}
.od-name { flex: 1 1 auto; min-width: 0; font-size: 0.92rem; font-weight: 600; color: var(--cust-text, #1f2937); line-height: 1.3; }
.od-size {
  display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 999px;
  background: #f3f4f6; color: #4b5563; font-size: 0.74rem; font-weight: 600;
}
.od-qty { flex: 0 0 auto; font-weight: 700; color: #b8862b; font-size: 0.95rem; }
.od-more {
  width: 100%; padding: 8px 0 10px; border: none; background: none; color: #b8862b;
  font-weight: 600; font-size: 0.85rem; cursor: pointer;
}

.od-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px 14px; border-top: 1px solid var(--cust-border, #ececec);
}
.od-disc { font-size: 0.78rem; color: #15803d; font-weight: 600; margin-bottom: 4px; }
.od-pts { font-size: 0.78rem; color: #b8862b; font-weight: 700; margin-top: 2px; }
.od-total-label { font-size: 0.76rem; color: var(--cust-text-muted, #6b7280); }
.od-total { font-size: 1.15rem; font-weight: 800; color: #b8862b; }
.od-actions { display: flex; gap: 8px; }
.od-btn {
  padding: 9px 18px; border-radius: 10px; font-weight: 700; font-size: 0.88rem; cursor: pointer; background: #fff;
}
.od-chat { border: 1px solid var(--gold); color: #b8862b; }
.od-chat:hover { background: var(--gold); color: #fff; }
.od-cancel { border: 1px solid #fca5a5; color: #dc2626; }
.od-cancel:hover { background: #dc2626; border-color: #dc2626; color: #fff; }

.od-empty { text-align: center; padding: 50px 16px; color: var(--cust-text-muted, #6b7280); }
`;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fmtTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function imgSrc(path) {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;
}

// ໂລໂກ້ຂົນສົ່ງ (ໄຟລ໌ຢູ່ frontend/public/carriers/<key>.png)
function CarrierChip({ carrierKey }) {
  const [failed, setFailed] = useState(false);
  const c = CARRIERS[carrierKey];
  if (!c) return null;
  const size = 24;
  return (
    <span className="od-chip">
      {failed ? (
        <span className="od-clogo-fb" style={{ width: size, height: size, fontSize: 12, background: c.color }}>
          {c.name[0]}
        </span>
      ) : (
        <img
          className="od-clogo"
          style={{ width: size, height: size }}
          src={`/carriers/${carrierKey}.png`}
          alt={c.name}
          onError={() => setFailed(true)}
        />
      )}
      {c.name}
    </span>
  );
}

function OrderCard({ order, onCancel, onChat }) {
  const { t } = usePageT(dict);
  const [expanded, setExpanded] = useState(false);
  const statusKey = order.order_status || 'awaiting_review';
  const cod = order.payment_method === 'cod';
  const known = STATUS[statusKey];
  const stColor = known || { bg: '#f3f4f6', color: '#6b7280' };
  // COD ບໍ່ມີສະລິບໃຫ້ກວດ → ໃຊ້ຄຳວ່າ "ລໍຖ້າຢືນຢັນ"
  let stLabel = statusKey;
  if (known) {
    stLabel = statusKey === 'awaiting_review' && cod ? t('od.st.awaiting_cod') : t(`od.st.${statusKey}`);
  }
  const items = order.items || [];
  const shown = expanded ? items : items.slice(0, MAX_ITEMS_COLLAPSED);
  const hidden = items.length - MAX_ITEMS_COLLAPSED;
  const showCodTotal = cod && statusKey !== 'cancelled' && statusKey !== 'delivered';
  const discount = Number(order.discount_amount || 0);
  const pointsEarned = Number(order.points_earned || 0);

  return (
    <div className="od-card">
      <div className="od-head">
        <div>
          <div className="od-date">{fmtDate(order.created_at)}</div>
          <div className="od-sub">
            {fmtTime(order.created_at)}
            {order.bill_number ? ` · ${t('od.parcel')}: ${order.bill_number}` : ''}
          </div>
        </div>
        <span className="od-badge" style={{ background: stColor.bg, color: stColor.color }}>{stLabel}</span>
      </div>

      <div className="od-meta">
        <CarrierChip carrierKey={order.carrier} />
        <span className={`od-pay ${cod ? 'cod' : 'transfer'}`}>
          {cod ? t('od.cod') : t('od.transfer')}
        </span>
      </div>

      <div className="od-items">
        {shown.map((it, i) => {
          const src = imgSrc(it.image || it.product_image);
          return (
            <div className="od-item" key={i}>
              {src ? (
                <img className="od-thumb" src={src} alt={it.product_name} />
              ) : (
                <div className="od-thumb" />
              )}
              <div className="od-name">
                {it.product_name}
                {it.size ? <div><span className="od-size">{t('common.size')} {it.size}</span></div> : null}
              </div>
              <div className="od-qty">×{it.quantity}</div>
            </div>
          );
        })}
        {hidden > 0 && (
          <button className="od-more" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('od.hide') : t('od.more', { n: hidden })}
          </button>
        )}
      </div>

      <div className="od-foot">
        <div>
          {discount > 0 && (
            <div className="od-disc">
              {t('od.coupon')}{order.coupon_name ? ` ${order.coupon_name}` : ''}: −{fmt(discount)} {t('common.kip')}
            </div>
          )}
          <div className="od-total-label">{showCodTotal ? t('od.codTotal') : t('od.total')}</div>
          <div className="od-total">{fmt(order.total)} {t('common.kip')}</div>
          {statusKey === 'delivered' && pointsEarned > 0 && (
            <div className="od-pts">{t('od.points', { n: fmt(pointsEarned) })}</div>
          )}
        </div>
        <div className="od-actions">
          {statusKey === 'awaiting_review' && (
            <button className="od-btn od-cancel" onClick={() => onCancel(order.id)}>{t('common.cancel')}</button>
          )}
          <button className="od-btn od-chat" onClick={() => onChat(order.id)}>{t('menu.chat')}</button>
        </div>
      </div>
    </div>
  );
}

function CustomerOrdersInner() {
  const { t } = usePageT(dict);
  const [orders, setOrders] = useState(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const [searchParams] = useSearchParams();
  // ຮອງຮັບລິງກ໌ຈາກໜ້າບັນຊີ: /menu/orders?status=shipped
  const initialStatus = searchParams.get('status');
  const [filter, setFilter] = useState(TAB_KEYS.includes(initialStatus) ? initialStatus : 'all');
  const [cancelId, setCancelId] = useState(null); // ออเดอร์ที่รอยืนยันการยกเลิก
  const [notice, setNotice] = useState(''); // ข้อความแจ้งแทน alert()
  const navigate = useNavigate();

  async function load() {
    const res = await fetch('/api/customer/orders', {
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    const data = await res.json();
    if (data.success) {
      setOrders(data.orders);
    } else {
      setLoggedIn(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loggedIn) navigate('/menu/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // กดปุ่มยกเลิกในการ์ด → เปิดกล่องยืนยัน
  function askCancel(orderId) {
    setCancelId(orderId);
  }

  async function doCancel() {
    const orderId = cancelId;
    setCancelId(null);
    try {
      const { data } = await apiPost(`/api/orders/${orderId}/cancel`, {});
      if (data.success) {
        load();
      } else {
        setNotice(data.error || t('od.cancelFail'));
      }
    } catch (err) {
      console.error(err);
      setNotice(t('od.cancelFail'));
    }
  }

  function openChat(orderId) {
    navigate(`/menu/chat?orderId=${orderId}`);
  }

  if (!loggedIn) return null;

  const sorted = orders
    ? [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : null;

  const countOf = (key) => {
    if (!sorted) return 0;
    if (key === 'all') return sorted.length;
    return sorted.filter((o) => (o.order_status || 'awaiting_review') === key).length;
  };

  const visible = sorted
    ? sorted.filter((o) => filter === 'all' || (o.order_status || 'awaiting_review') === filter)
    : null;

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="od-wrap">
        <h1 className="od-title">{t('od.title')}</h1>

        <div className="od-tabs">
          {TAB_KEYS.map((key) => (
            <button
              key={key}
              className={`od-tab${filter === key ? ' active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {t(`od.tab.${key}`)}
              <span className="od-tab-count">{countOf(key)}</span>
            </button>
          ))}
        </div>

        {visible === null && (
          <p className="od-empty">{t('common.loading')}</p>
        )}

        {visible && visible.length === 0 && (
          <p className="od-empty">
            {filter === 'all' ? t('od.emptyAll') : t('od.emptyStatus')}
          </p>
        )}

        {visible && visible.length > 0 && (
          <div className="od-list">
            {visible.map((order) => (
              <OrderCard key={order.id} order={order} onCancel={askCancel} onChat={openChat} />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={cancelId !== null}
        message={t('od.cancelConfirm')}
        danger
        onConfirm={doCancel}
        onCancel={() => setCancelId(null)}
      />

      <ConfirmModal
        open={!!notice}
        message={notice}
        hideCancel
        onConfirm={() => setNotice('')}
        onCancel={() => setNotice('')}
      />
    </div>
  );
}

export default function CustomerOrders() {
  return (
    <CartProvider>
      <CustomerOrdersInner />
    </CartProvider>
  );
}