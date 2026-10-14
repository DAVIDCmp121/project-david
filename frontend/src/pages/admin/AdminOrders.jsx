import { useEffect, useRef, useState } from 'react';
import { apiPost, apiPut, getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import DateField from '../../components/DateField.jsx';
import ShippingSettingsModal from '../../components/ShippingSettingsModal.jsx';
import { usePageT } from '../../useT.js';
import orderDict from '../../locales/orders.js';
import shipDict from '../../locales/shipping-settings.js';

// ลำดับขั้นตอนของออเดอร์ (ออนไลน์)
const FLOW = ['awaiting_review', 'confirmed', 'shipped', 'delivered'];

// ★ ออเดอร์ที่รอตรวจสอบนานเกินกี่ชั่วโมง จะขึ้นเตือนสีแดง
const OVERDUE_HOURS = 24;

// key ຕ້ອງກົງກັບ Checkout.jsx / backend (VALID_CARRIERS)
const CARRIERS = {
  anousith: { name: 'Anousith Express', color: '#c62828' },
  hal: { name: 'HAL Express', color: '#d32f2f' },
  mixay: { name: 'Mixay Express', color: '#b71c1c' },
};

function isCod(o) {
  return o.payment_method === 'cod';
}

// ★ ບິນໜ້າຮ້ານ (POS) ຫຼື ອອນລາຍ — ແກ້ຟັງຊັນນີ້ຖ້າ backend ມີຟິວທີ່ຕ່າງອອກໄປ
function isPos(o) {
  const v = String(o.channel || o.source || o.order_type || '').toLowerCase();
  if (v) return v === 'pos' || v === 'store' || v === 'instore';
  return !o.carrier && !o.customer_phone && !o.customer_address;
}

// ★ รอตรวจมากี่ชั่วโมงแล้ว
function hoursWaiting(o) {
  const ms = Date.now() - new Date(o.created_at).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 3600000);
}

// ★ ออเดอร์ออนไลน์ที่ยังรอตรวจ และรอนานเกินกำหนด
function isOverdue(o) {
  return (
    !isPos(o) &&
    (o.order_status || 'awaiting_review') === 'awaiting_review' &&
    hoursWaiting(o) >= OVERDUE_HOURS
  );
}

function waitText(o, t) {
  const h = hoursWaiting(o);
  return h >= 48 ? t('o.waitDays', { d: Math.floor(h / 24) }) : t('o.waitHours', { h });
}

// ★ เอาอันที่ค้างนานไว้บนสุด (นานสุดก่อน) ที่เหลือเรียงเหมือนเดิม
function sortOverdueFirst(arr) {
  const over = arr
    .filter(isOverdue)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (over.length === 0) return arr;
  return [...over, ...arr.filter((o) => !isOverdue(o))];
}

// ป้ายสถานะ: COD ไม่มีสลิป จึงใช้คำว่า "รอยืนยัน" แทน
function statusText(o, t) {
  const st = o.order_status || 'awaiting_review';
  if (isPos(o) && st !== 'cancelled') return t('o.st.done');
  if (st === 'awaiting_review' && isCod(o)) return t('o.st.codWait');
  return t('o.st.' + st);
}

function stepLabel(s, o, t) {
  if (s === 'awaiting_review' && o && isCod(o)) return t('o.st.codWait');
  return t('o.st.' + s);
}

// ปุ่มหลักที่จะขึ้นในแต่ละสถานะ (ขั้นถัดไป)
const NEXT = {
  confirmed: {
    to: 'shipped',
    labelKey: 'o.st.shipped',
    icon: '🚚',
    askKey: 'o.askShipped',
    doneKey: 'o.doneShipped',
  },
  shipped: {
    to: 'delivered',
    labelKey: 'o.st.delivered',
    icon: '📦',
    askKey: 'o.askDelivered',
    doneKey: 'o.doneDelivered',
  },
};

const PAGE_SIZE = 20;

// ---------- ★ ຈຳວ່າອໍເດີໃດ "ອ່ານແລ້ວ" (ເກັບໃນເບົາເຊີຂອງເຄື່ອງນີ້) ----------
const READ_KEY = 'ao_read_v1';
const NO_BADGE = ['all', 'delivered']; // ແທັບທີ່ບໍ່ສະແດງຕົວເລກ

function loadRead() {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}
function saveRead(set) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch (e) {
    /* ignore */
  }
}
function hasBaseline() {
  try {
    return localStorage.getItem(READ_KEY) !== null;
  } catch (e) {
    return true;
  }
}
// ຈຳແຍກຕາມສະຖານະ: ຖ້າສະຖານະປ່ຽນ (ເຊັ່ນ ລູກຄ້າຍົກເລີກ) ຈະກັບມາເປັນ "ຍັງບໍ່ອ່ານ" ອີກຄັ້ງ
const readKey = (o) => `${o.id}:${o.order_status || 'awaiting_review'}`;

const CSS = `
.ao-root{font-family:inherit;color:#1f2937}

.ao-topbar{display:flex;justify-content:flex-end;margin-bottom:10px}
.ao-shipbtn{border:1px solid var(--gold,#c9a227);background:#fff;color:#9a7412;border-radius:999px;padding:8px 16px;font-weight:700;font-size:.88rem;cursor:pointer;font-family:inherit;transition:background-color .15s,color .15s}
.ao-shipbtn:hover{background:var(--gold,#c9a227);color:#fff}

.ao-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:.9rem;font-weight:700}
.ao-alert button{border:none;background:#dc2626;color:#fff;border-radius:8px;padding:7px 14px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.85rem;white-space:nowrap}

.ao-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;background:#eceef2;padding:4px;border-radius:14px;margin-bottom:12px}
.ao-seg-b{position:relative;border:0;background:transparent;border-radius:10px;padding:9px 4px;font-size:.85rem;color:#6b7280;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer;font-family:inherit}
.ao-seg-b b{font-size:1.1rem;font-weight:800;color:#1f2937}
.ao-seg-b.on{background:#fff;box-shadow:0 1px 3px rgba(16,24,40,.1)}
.ao-seg-b.pos.on,.ao-seg-b.pos.on b{color:#0f766e}
.ao-seg-b.online.on,.ao-seg-b.online.on b{color:#5b21b6}
.ao-seg-b .dot{position:absolute;top:5px;right:8px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font-size:.7rem;font-weight:700;display:grid;place-items:center;font-style:normal}

.ao-tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;scrollbar-width:thin}
.ao-tab{border:1px solid #e5e7eb;background:#fff;color:#374151;border-radius:999px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:8px;font-size:.9rem;font-family:inherit}
.ao-tab.active{background:var(--blue,#2563eb);border-color:var(--blue,#2563eb);color:#fff}
.ao-tab .n{background:#f3f4f6;color:#4b5563;border-radius:999px;min-width:22px;height:22px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:700}
.ao-tab.active .n{background:rgba(255,255,255,.25);color:#fff}
.ao-tab .n.alert{background:#ef4444;color:#fff}
.ao-tab.cancel{margin-left:auto;border-style:dashed;color:#6b7280}
.ao-tab.cancel.active{color:#fff}

.ao-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.ao-filters input,.ao-filters select{margin:0;width:auto;padding:9px 14px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;box-sizing:border-box;font-size:.88rem;font-family:inherit;color:#1f2937}
.ao-filters .grow{flex:1 1 200px;min-width:0}
.ao-ghost{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:0 14px;height:38px;cursor:pointer;color:#374151;font-family:inherit}
.ao-count{font-size:.82rem;color:#6b7280;margin:0 2px 10px}

.ao-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:10px;overflow:hidden}
.ao-card.pending{border-left:4px solid #f59e0b}
.ao-card.overdue{border-left:4px solid #ef4444;border-color:#fecaca;background:#fffafa}
.ao-card.pos{border-left:4px solid #14b8a6}
.ao-main{display:grid;grid-template-columns:48px minmax(0,1fr) 150px 150px 200px;align-items:center;gap:16px;padding:16px 18px;cursor:pointer}
.ao-main:hover{background:#fafbfc}
.ao-num{font-weight:800;font-size:1.05rem;color:#9ca3af}
.ao-new{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;margin-left:5px;vertical-align:middle}
.ao-items{font-weight:700;font-size:1rem;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.35}
.ao-sub{font-size:.82rem;color:#6b7280;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-total{font-weight:800;font-size:1.02rem;text-align:right;white-space:nowrap}
.ao-collect{font-size:.72rem;font-weight:700;color:#c2410c;margin-top:3px}
.ao-actions{display:flex;gap:6px;justify-content:flex-end;align-items:center}

.ao-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}
.ao-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px 3px 4px;border-radius:999px;background:#f3f4f6;font-size:.76rem;font-weight:600;color:#374151;white-space:nowrap}
.ao-clogo{border-radius:5px;object-fit:cover;background:#f4f4f2;flex:0 0 auto}
.ao-clogo-fb{border-radius:5px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;flex:0 0 auto}
.ao-pay{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:700;white-space:nowrap}
.ao-pay.transfer{background:#e0f2fe;color:#0369a1}
.ao-pay.cod{background:#ffedd5;color:#c2410c}
.ao-pay.cash{background:#dcfce7;color:#15803d}
.ao-ch{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:700;white-space:nowrap}
.ao-ch.pos{background:#ccfbf1;color:#0f766e}
.ao-ch.online{background:#ede9fe;color:#5b21b6}
.ao-wait{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.74rem;font-weight:800;white-space:nowrap;background:#fee2e2;color:#b91c1c}

.ao-badge{display:inline-block;padding:5px 13px;border-radius:999px;font-size:.8rem;font-weight:700;white-space:nowrap}
.ao-st-awaiting_review{background:#fef3c7;color:#b45309}
.ao-st-confirmed{background:#dbeafe;color:#1d4ed8}
.ao-st-shipped{background:#ede9fe;color:#6d28d9}
.ao-st-delivered{background:#dcfce7;color:#15803d}
.ao-st-cancelled{background:#fee2e2;color:#b91c1c}

.ao-btn{border:none;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer;color:#fff;white-space:nowrap;font-family:inherit;font-size:.86rem}
.ao-btn:disabled{opacity:.5;cursor:default}
.ao-btn.review{background:#16a34a}
.ao-btn.next-confirmed{background:var(--blue,#2563eb)}
.ao-btn.next-shipped{background:#7c3aed}
.ao-more{border:1px solid #e5e7eb;background:#fff;border-radius:9px;width:36px;height:36px;cursor:pointer;font-size:1.1rem;line-height:1;color:#4b5563;padding:0}
.ao-menu-wrap{position:relative}
.ao-menu{position:absolute;right:0;top:42px;z-index:20;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:200px;padding:4px}
.ao-menu button{display:block;width:100%;text-align:left;border:none;background:none;padding:9px 12px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:.88rem;color:#1f2937}
.ao-menu button:hover{background:#f3f4f6}
.ao-menu button.danger{color:#dc2626}
.ao-done{color:#15803d;font-weight:700;font-size:.86rem;padding-right:4px}
.ao-by{font-size:.78rem;color:#6b7280}

.ao-detail{border-top:1px solid #f0f0f0;padding:16px 18px 18px;background:#fcfcfd;cursor:default}
.ao-codbox{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:.88rem}
.ao-codbox b{font-size:1.05rem}
.ao-steps{display:flex;margin-bottom:18px}
.ao-step{flex:1;position:relative;text-align:center;font-size:.76rem;color:#9ca3af}
.ao-step:not(:first-child)::before{content:'';position:absolute;top:11px;left:-50%;width:100%;height:2px;background:#e5e7eb}
.ao-step.done:not(:first-child)::before{background:var(--blue,#2563eb)}
.ao-dot{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#e5e7eb;color:#6b7280;font-weight:700;font-size:.75rem}
.ao-step.done .ao-dot{background:var(--blue,#2563eb);color:#fff}
.ao-step.now{color:#111827;font-weight:700}
.ao-slabel{display:block;margin-top:4px}
.ao-dgrid{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}
.ao-dlabel{font-size:.75rem;color:#6b7280;font-weight:600;margin:0 0 3px}
.ao-dval{margin-bottom:10px;word-break:break-word;font-size:.9rem}
.ao-li{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:.9rem}
.ao-li.total{font-weight:700;border-bottom:none}
.ao-size{display:inline-block;background:#f3f4f6;border-radius:6px;padding:0 6px;margin-left:6px;font-size:.75rem;font-weight:600}
.ao-slip{max-width:140px;max-height:160px;border-radius:8px;border:1px solid #e5e7eb;cursor:zoom-in;object-fit:contain;background:#fff;display:block}

.ao-loadmore{display:block;margin:14px auto;border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:10px 24px;cursor:pointer;font-family:inherit;color:#374151;font-weight:600}
.ao-empty{text-align:center;color:#9ca3af;padding:40px 10px}
.ao-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 18px;border-radius:999px;font-size:.9rem;z-index:3000;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:92%;text-align:center}

@media (max-width:760px){
  .ao-main{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"num info status" "total total actions";row-gap:10px;padding:14px}
  .ao-num{grid-area:num}
  .ao-info{grid-area:info}
  .ao-status{grid-area:status}
  .ao-total{grid-area:total;text-align:left}
  .ao-actions{grid-area:actions}
  .ao-dgrid{grid-template-columns:1fr}
  .ao-tab.cancel{margin-left:0}
}
`;

// ---------- ฟังก์ชันช่วย ----------
function itemLabel(it) {
  const sizePart = it.size ? ' (' + it.size + ')' : '';
  return it.product_name + sizePart + ' ×' + it.quantity;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDateKey(str) {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function whenText(str, t) {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `${t('common.today')} ${time}`;
  if (d.toDateString() === yest.toDateString()) return `${t('common.yesterday')} ${time}`;
  return `${d.toLocaleDateString('en-GB')} ${time}`;
}

function itemsSummary(o, t) {
  const items = o.items || [];
  if (items.length === 0) return '-';
  const first = itemLabel(items[0]);
  return items.length > 1 ? `${first} ${t('o.moreItems', { n: items.length - 1 })}` : first;
}

// ---------- ໂລໂກ້ຂົນສົ່ງ ----------
function CarrierLogo({ carrierKey, size = 20 }) {
  const [failed, setFailed] = useState(false);
  const c = CARRIERS[carrierKey];
  if (!c) return null;
  if (failed) {
    return (
      <span className="ao-clogo-fb" style={{ width: size, height: size, fontSize: size * 0.5, background: c.color }}>
        {c.name[0]}
      </span>
    );
  }
  return (
    <img
      className="ao-clogo"
      style={{ width: size, height: size }}
      src={`/carriers/${carrierKey}.png`}
      alt={c.name}
      onError={() => setFailed(true)}
    />
  );
}

function CarrierChip({ carrierKey }) {
  if (!CARRIERS[carrierKey]) return null;
  return (
    <span className="ao-chip">
      <CarrierLogo carrierKey={carrierKey} />
      {CARRIERS[carrierKey].name}
    </span>
  );
}

function PayBadge({ order }) {
  const { t } = usePageT(orderDict);
  const pm = order.payment_method || 'transfer';
  const cls = pm === 'cod' ? 'cod' : pm === 'cash' ? 'cash' : 'transfer';
  const label = pm === 'cod' ? 'COD' : pm === 'cash' ? t('o.payCash') : t('o.payTransfer');
  return <span className={`ao-pay ${cls}`}>{label}</span>;
}

function ChannelTag({ order }) {
  const { t } = usePageT(orderDict);
  const pos = isPos(order);
  return (
    <span className={`ao-ch ${pos ? 'pos' : 'online'}`}>
      {pos ? '🏪 ' + t('o.pos') : '🚚 ' + t('o.online')}
    </span>
  );
}

function Steps({ order }) {
  const { t } = usePageT(orderDict);
  const status = order.order_status || 'awaiting_review';
  const idx = FLOW.indexOf(status);
  return (
    <div className="ao-steps">
      {FLOW.map((s, i) => (
        <div key={s} className={`ao-step ${i <= idx ? 'done' : ''} ${i === idx ? 'now' : ''}`}>
          <span className="ao-dot">{i < idx ? '✓' : i + 1}</span>
          <span className="ao-slabel">{stepLabel(s, order, t)}</span>
        </div>
      ))}
    </div>
  );
}

const dateFilterStyle = {
  width: 'auto',
  minWidth: 160,
  margin: 0,
  padding: '9px 14px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  background: '#fff',
  fontSize: '.88rem',
  color: '#1f2937',
};

// ---------- หน้าออเดอร์ ----------
export default function AdminOrders() {
  const { t } = usePageT(orderDict);
  const { t: ts } = usePageT(shipDict);

  const [allOrders, setAllOrders] = useState([]);
  const [channel, setChannel] = useState('all'); // all | pos | online
  const [tab, setTab] = useState('all');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCarrier, setFilterCarrier] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [shipOpen, setShipOpen] = useState(false); // ★ ป๊อปอัปตั้งค่าค่าส่ง
  const [toast, setToast] = useState('');
  const [readSet, setReadSet] = useState(() => loadRead());
  const [, setTick] = useState(0); // ★ ใช้ให้หน้าคำนวณ "รอมากี่ชม." ใหม่ทุกนาที
  const toastTimer = useRef(null);

  const fmtMoney = (n) => `${Number(n || 0).toLocaleString('en-US')} ${t('common.kip')}`;

  function markReadKey(k) {
    setReadSet((prev) => {
      if (prev.has(k)) return prev;
      const s = new Set(prev);
      s.add(k);
      saveRead(s);
      return s;
    });
  }
  function markRead(o) {
    markReadKey(readKey(o));
  }
  function openReview(o) {
    markRead(o);
    setReviewOrder(o);
  }

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders', {
        credentials: 'include',
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllOrders(data);
        // ຄັ້ງທຳອິດທີ່ໃຊ້: ຖືວ່າອໍເດີເກົ່າທັງໝົດອ່ານແລ້ວ (ບໍ່ງັ້ນຕົວເລກຈະເດັ້ງເປັນສິບໆ)
        if (!hasBaseline()) {
          const s = new Set(data.map(readKey));
          saveRead(s);
          setReadSet(s);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadOrders();
    return () => clearTimeout(toastTimer.current);
  }, []);

  // ★ รีเฟรชตัวเลขชั่วโมงทุก 60 วินาที
  useEffect(() => {
    const timer = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLimit(PAGE_SIZE);
    setExpandedId(null);
  }, [channel, tab, searchPhone, filterDate, filterCarrier, filterPay]);

  useEffect(() => {
    if (menuId === null) return undefined;
    const close = () => setMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuId]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }

  function changeChannel(c) {
    setChannel(c);
    setTab('all');
    if (c === 'pos') setFilterCarrier('');
  }

  // ອໍເດີລ່າສຸດ = #1 ແລ້ວນັບລົງ
  const orderNumbers = {};
  [...allOrders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach((o, idx) => {
      orderNumbers[o.id] = idx + 1;
    });

  // ★ จำนวนออเดอร์ที่รอตรวจเกินกำหนด (นับจากทั้งหมด ไม่ขึ้นกับตัวกรอง)
  const overdueCount = allOrders.filter(isOverdue).length;

  // ---------- กรอง ----------
  let filtered = allOrders;
  if (searchPhone) {
    filtered = filtered.filter((o) => (o.customer_phone || '').includes(searchPhone.trim()));
  }
  if (filterDate) {
    filtered = filtered.filter((o) => localDateKey(o.created_at) === filterDate);
  }
  if (filterCarrier) {
    filtered = filtered.filter((o) => o.carrier === filterCarrier);
  }
  if (filterPay) {
    filtered = filtered.filter((o) => (o.payment_method || 'transfer') === filterPay);
  }

  // ຈຳນວນຕາມຊ່ອງທາງ (ບໍ່ນັບທີ່ຍົກເລີກ)
  const liveFiltered = filtered.filter((o) => o.order_status !== 'cancelled');
  const chCounts = {
    all: liveFiltered.length,
    pos: liveFiltered.filter(isPos).length,
    online: liveFiltered.filter((o) => !isPos(o)).length,
  };
  const onlinePending = liveFiltered.filter(
    (o) => !isPos(o) && (o.order_status || 'awaiting_review') === 'awaiting_review'
  ).length;

  const inChannel =
    channel === 'all' ? filtered : filtered.filter((o) => (channel === 'pos') === isPos(o));

  const active = inChannel.filter((o) => o.order_status !== 'cancelled');
  const cancelled = inChannel.filter((o) => o.order_status === 'cancelled');

  const counts = { all: active.length, cancelled: cancelled.length };
  FLOW.forEach((s) => {
    counts[s] = active.filter((o) => (o.order_status || 'awaiting_review') === s).length;
  });

  // ★ ຕົວເລກເທິງແທັບ = ຈຳນວນທີ່ "ຍັງບໍ່ອ່ານ" (ບິນໜ້າຮ້ານບໍ່ນັບ)
  const isUnread = (o) => !isPos(o) && !readSet.has(readKey(o));
  const unread = { cancelled: cancelled.filter(isUnread).length };
  FLOW.forEach((s) => {
    unread[s] = active.filter(
      (o) => (o.order_status || 'awaiting_review') === s && isUnread(o)
    ).length;
  });

  let list;
  if (tab === 'cancelled') list = cancelled;
  else if (tab === 'all') list = active;
  else list = active.filter((o) => (o.order_status || 'awaiting_review') === tab);

  // ★ ออเดอร์ที่ค้างตรวจเกินกำหนดขึ้นบนสุด
  list = sortOverdueFirst(list);

  const visible = list.slice(0, limit);
  const hasFilter = !!(searchPhone || filterDate || filterCarrier || filterPay);

  // ---------- การทำงาน ----------
  async function changeStatus(id, to, okMsg) {
    setBusyId(id);
    try {
      const { data } = await apiPut(`/api/orders/${id}`, { order_status: to });
      if (!data.success) {
        alert(data.error || t('o.errStatus'));
        return false;
      }
      await loadOrders();
      markReadKey(`${id}:${to}`); // ເຮົາປ່ຽນເອງ ບໍ່ຕ້ອງໃຫ້ກາຍເປັນ "ຍັງບໍ່ອ່ານ"
      showToast(okMsg);
      return true;
    } catch (e) {
      alert(t('o.errServer'));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSlip(o) {
    const n = orderNumbers[o.id];
    const ok = await changeStatus(o.id, 'confirmed', t('o.toastConfirmed', { n }));
    if (ok) setReviewOrder(null);
  }

  function askNext(o, st) {
    const cfg = NEXT[st];
    const n = orderNumbers[o.id];
    const message =
      st === 'shipped' && isCod(o) ? t('o.askDeliveredCod', { n }) : t(cfg.askKey, { n });
    setStatusConfirm({ id: o.id, to: cfg.to, message, okMsg: t(cfg.doneKey, { n }) });
  }

  function doStatusConfirm() {
    const s = statusConfirm;
    setStatusConfirm(null);
    if (s) changeStatus(s.id, s.to, s.okMsg);
  }

  function adminCancelOrder(id) {
    setCancelConfirm({ id, message: t('o.askCancel') });
  }

  function rejectSlip(o) {
    setCancelConfirm({
      id: o.id,
      message: isCod(o) ? t('o.askCancel') : t('o.askRejectSlip'),
    });
  }

  async function confirmCancelOrder() {
    const id = cancelConfirm.id;
    setCancelConfirm(null);
    setBusyId(id);
    try {
      const { data } = await apiPost(`/api/orders/${id}/admin-cancel`, {});
      if (!data.success) {
        alert(data.error || t('o.errCancel'));
        return;
      }
      setReviewOrder(null);
      await loadOrders();
      markReadKey(`${id}:cancelled`);
      showToast(t('o.toastCancelled', { n: orderNumbers[id] }));
    } catch (e) {
      alert(t('o.errServer'));
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setSearchPhone('');
    setFilterDate('');
    setFilterCarrier('');
    setFilterPay('');
  }

  // ★ กดจากแถบเตือน: ไปแท็บ "รอตรวจสอบ" ของออเดอร์ออนไลน์ และล้างตัวกรอง
  function showOverdue() {
    clearFilters();
    changeChannel('online');
    setTab('awaiting_review');
  }

  // ---------- แสดงผลแถว ----------
  function renderRow(o) {
    const st = o.order_status || 'awaiting_review';
    const isCancelled = st === 'cancelled';
    const pos = isPos(o);
    const cod = isCod(o);
    const open = expandedId === o.id;
    const n = orderNumbers[o.id];
    const qty = (o.items || []).reduce((s, it) => s + it.quantity, 0);
    const busy = busyId === o.id;
    const badgeClass = isCancelled ? 'cancelled' : pos ? 'delivered' : st;
    const unreadRow = !pos && !readSet.has(readKey(o));
    const overdue = isOverdue(o);

    return (
      <div
        key={o.id}
        className={`ao-card ${pos ? 'pos' : overdue ? 'overdue' : st === 'awaiting_review' ? 'pending' : ''}`}
      >
        <div
          className="ao-main"
          onClick={() => {
            if (!open) markRead(o);
            setExpandedId(open ? null : o.id);
          }}
        >
          <div className="ao-num">
            #{n}
            {unreadRow && <i className="ao-new" />}
          </div>

          <div className="ao-info">
            <div className="ao-items">{itemsSummary(o, t)}</div>
            <div className="ao-sub">
              {pos ? t('o.posSale') : o.customer_phone || '-'} · {qty} {t('o.pcs')} · {whenText(o.created_at, t)}
            </div>
            <div className="ao-chips">
              <ChannelTag order={o} />
              {!pos && <CarrierChip carrierKey={o.carrier} />}
              <PayBadge order={o} />
              {overdue && <span className="ao-wait">⏰ {waitText(o, t)}</span>}
            </div>
          </div>

          <div className="ao-total">
            {fmtMoney(o.total)}
            {cod && !isCancelled && <div className="ao-collect">{t('o.collect')}</div>}
          </div>

          <div className="ao-status">
            <span className={`ao-badge ao-st-${badgeClass}`}>
              {isCancelled ? t('o.st.cancelled') : statusText(o, t)}
            </span>
          </div>

          <div className="ao-actions" onClick={(e) => e.stopPropagation()}>
            {isCancelled && o.cancelled_by && (
              <span className="ao-by">{t('o.by.' + o.cancelled_by)}</span>
            )}

            {!pos && st === 'awaiting_review' && (
              <button className="ao-btn review" disabled={busy} onClick={() => openReview(o)}>
                {cod ? t('common.confirm') : t('o.btnReview')}
              </button>
            )}
            {!pos && NEXT[st] && (
              <button className={`ao-btn next-${st}`} disabled={busy} onClick={() => askNext(o, st)}>
                {NEXT[st].icon} {t(NEXT[st].labelKey)}
              </button>
            )}
            {!pos && st === 'delivered' && <span className="ao-done">✓ {t('o.st.done')}</span>}

            {!isCancelled && (
              <div className="ao-menu-wrap">
                <button
                  className="ao-more"
                  aria-label="menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(menuId === o.id ? null : o.id);
                  }}
                >
                  ⋯
                </button>
                {menuId === o.id && (
                  <div className="ao-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setMenuId(null);
                        openReview(o);
                      }}
                    >
                      🔍 {cod || pos ? t('o.viewDetail') : t('o.viewSlipDetail')}
                    </button>
                    {(st !== 'delivered' || pos) && (
                      <button
                        className="danger"
                        onClick={() => {
                          setMenuId(null);
                          adminCancelOrder(o.id);
                        }}
                      >
                        ✕ {pos ? t('o.cancelBill') : t('o.cancelOrder')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {open && (
          <div className="ao-detail">
            {cod && !isCancelled && (
              <div className="ao-codbox">
                {t('o.codBox')} <b>{fmtMoney(o.total)}</b>
              </div>
            )}
            {!pos && !isCancelled && <Steps order={o} />}
            <div className="ao-dgrid">
              <div>
                <div className="ao-dlabel">{t('o.products')}</div>
                {(o.items || []).map((it, i) => (
                  <div className="ao-li" key={i}>
                    <span>
                      {it.product_name}
                      {it.size && <span className="ao-size">{it.size}</span>} ×{it.quantity}
                    </span>
                    <span>{fmtMoney(it.price_at_order * it.quantity)}</span>
                  </div>
                ))}
                <div className="ao-li total">
                  <span>{t('o.totalPrice')}</span>
                  <span>{fmtMoney(o.total)}</span>
                </div>
              </div>
              <div>
                <div className="ao-dlabel">{t('o.channel')}</div>
                <div className="ao-dval"><ChannelTag order={o} /></div>
                {!pos && (
                  <>
                    <div className="ao-dlabel">{t('o.carrier')}</div>
                    <div className="ao-dval">
                      {CARRIERS[o.carrier] ? <CarrierChip carrierKey={o.carrier} /> : '-'}
                    </div>
                  </>
                )}
                <div className="ao-dlabel">{t('o.payMethod')}</div>
                <div className="ao-dval"><PayBadge order={o} /></div>
                {!pos && (
                  <>
                    <div className="ao-dlabel">{t('o.phone')}</div>
                    <div className="ao-dval">{o.customer_phone || '-'}</div>
                    <div className="ao-dlabel">{t('o.address')}</div>
                    <div className="ao-dval">{o.customer_address || '-'}</div>
                  </>
                )}
                {o.slip_image && (
                  <>
                    <div className="ao-dlabel">{t('o.slipZoom')}</div>
                    <img className="ao-slip" src={o.slip_image} alt="slip" onClick={() => openReview(o)} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ແທັບສະຖານະ: ໜ້າຮ້ານມີແຕ່ "ທັງໝົດ" ແລະ "ຍົກເລີກ" (ຂາຍແລ້ວຈົບເລີຍ)
  const tabs =
    channel === 'pos'
      ? [{ key: 'all', label: t('common.all') }]
      : [
          { key: 'all', label: t('common.all') },
          ...FLOW.map((s) => ({
            key: s,
            label: s === 'awaiting_review' ? t('o.tab.review') : t('o.st.' + s),
          })),
        ];

  const reviewStatus = reviewOrder ? reviewOrder.order_status || 'awaiting_review' : '';
  const reviewCod = reviewOrder ? isCod(reviewOrder) : false;
  const reviewPos = reviewOrder ? isPos(reviewOrder) : false;

  return (
    <div className="ao-root">
      <style>{CSS}</style>

      {/* ---------- ★ ปุ่มตั้งค่าค่าส่ง / ส่งฟรี ---------- */}
      <div className="ao-topbar">
        <button type="button" className="ao-shipbtn" onClick={() => setShipOpen(true)}>
          🚚 {ts('ss.btn')}
        </button>
      </div>

      {/* ---------- ★ แถบเตือน: ออเดอร์รอตรวจเกินกำหนด ---------- */}
      {overdueCount > 0 && (
        <div className="ao-alert">
          <span>⚠️ {t('o.overdueBanner', { n: overdueCount })}</span>
          <button onClick={showOverdue}>{t('o.overdueView')}</button>
        </div>
      )}

      {/* ---------- ★ ແຍກຊ່ອງທາງ: ທັງໝົດ / ໜ້າຮ້ານ / ອອນລາຍ ---------- */}
      <div className="ao-seg">
        <button
          className={`ao-seg-b ${channel === 'all' ? 'on' : ''}`}
          onClick={() => changeChannel('all')}
        >
          <b>{chCounts.all}</b>{t('common.all')}
        </button>
        <button
          className={`ao-seg-b pos ${channel === 'pos' ? 'on' : ''}`}
          onClick={() => changeChannel('pos')}
        >
          <b>{chCounts.pos}</b>🏪 {t('o.pos')}
        </button>
        <button
          className={`ao-seg-b online ${channel === 'online' ? 'on' : ''}`}
          onClick={() => changeChannel('online')}
        >
          <b>{chCounts.online}</b>🚚 {t('o.online')}
          {onlinePending > 0 && <i className="dot">{onlinePending}</i>}
        </button>
      </div>

      {/* ---------- แท็บตามขั้นตอน (ตัวเลข = ยังไม่อ่าน) ---------- */}
      <div className="ao-tabs">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={`ao-tab ${tab === tb.key ? 'active' : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
            {!NO_BADGE.includes(tb.key) && unread[tb.key] > 0 && (
              <span className="n alert">{unread[tb.key]}</span>
            )}
          </button>
        ))}
        <button
          className={`ao-tab cancel ${tab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setTab('cancelled')}
        >
          {t('o.st.cancelled')}
          {unread.cancelled > 0 && <span className="n alert">{unread.cancelled}</span>}
        </button>
      </div>

      {/* ---------- ตัวกรอง ---------- */}
      <div className="ao-filters">
        <input
          className="grow"
          type="text"
          placeholder={channel === 'pos' ? t('common.search') : t('o.searchPhone')}
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
        />
        <DateField
          value={filterDate}
          onChange={setFilterDate}
          placeholder={t('o.filterDate')}
          style={dateFilterStyle}
        />
        {channel !== 'pos' && (
          <select value={filterCarrier} onChange={(e) => setFilterCarrier(e.target.value)}>
            <option value="">{t('o.allCarriers')}</option>
            {Object.entries(CARRIERS).map(([k, c]) => (
              <option key={k} value={k}>{c.name}</option>
            ))}
          </select>
        )}
        <select value={filterPay} onChange={(e) => setFilterPay(e.target.value)}>
          <option value="">{t('o.allPay')}</option>
          <option value="transfer">{t('o.payTransfer')}</option>
          <option value="cash">{t('o.payCash')}</option>
          {channel !== 'pos' && <option value="cod">COD</option>}
        </select>
        {hasFilter && (
          <button className="ao-ghost" onClick={clearFilters}>{t('o.clearFilter')}</button>
        )}
        <button className="ao-ghost" onClick={loadOrders} title={t('o.reload')}>↻</button>
      </div>
      <div className="ao-count">{t('common.found', { n: list.length })}</div>

      {/* ---------- รายการ ---------- */}
      {list.length === 0 ? (
        <div className="ao-empty">
          {hasFilter ? t('o.noMatch') : t('o.empty.' + tab)}
        </div>
      ) : (
        <>
          {visible.map(renderRow)}
          {list.length > visible.length && (
            <button className="ao-loadmore" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              {t('o.showMore', { n: list.length - visible.length })}
            </button>
          )}
        </>
      )}

      {/* ---------- popup กวดสอบสลิป / ดูรายละเอียด ---------- */}
      {reviewOrder && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setReviewOrder(null); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setReviewOrder(null)}>✕</button>
            <h2 style={{ color: 'var(--navy)', fontSize: '1.1rem' }}>
              {reviewStatus === 'awaiting_review' && !reviewPos
                ? (reviewCod ? t('o.modalCod') : t('o.modalSlip'))
                : t('o.modalDetail')} #{orderNumbers[reviewOrder.id]}
            </h2>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <ChannelTag order={reviewOrder} />
              {!reviewPos && <CarrierChip carrierKey={reviewOrder.carrier} />}
              <PayBadge order={reviewOrder} />
              {isOverdue(reviewOrder) && <span className="ao-wait">⏰ {waitText(reviewOrder, t)}</span>}
            </div>

            {!reviewPos && (
              <>
                <p style={{ marginBottom: 4, fontSize: '0.9rem' }}><strong>{t('o.phone')}:</strong> {reviewOrder.customer_phone || '-'}</p>
                <p style={{ marginBottom: 10, fontSize: '0.9rem' }}><strong>{t('o.address')}:</strong> {reviewOrder.customer_address || '-'}</p>
              </>
            )}

            <div style={{ marginBottom: 6, fontSize: '0.9rem' }}>
              {(reviewOrder.items || []).map((it, i) => (
                <div key={i}>{itemLabel(it)}</div>
              ))}
            </div>
            <p style={{ marginBottom: 10, fontSize: '0.9rem' }}>
              <strong>{reviewCod ? t('o.codAmount') : t('o.totalColon')}</strong> {fmtMoney(reviewOrder.total)}
            </p>

            {reviewOrder.slip_image && (
              <img
                src={reviewOrder.slip_image}
                alt="slip"
                style={{ maxWidth: '100%', maxHeight: 220, width: 'auto', display: 'block', margin: '0 auto 14px', objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            )}

            {reviewStatus === 'awaiting_review' && !reviewPos && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', position: 'sticky', bottom: 0, background: '#fff', paddingTop: 8 }}>
                <button className="cancel-btn" onClick={() => rejectSlip(reviewOrder)}>
                  {reviewCod ? t('o.btnRejectCod') : t('o.btnWrong')}
                </button>
                <button className="primary" disabled={busyId === reviewOrder.id} onClick={() => confirmSlip(reviewOrder)}>
                  {reviewCod ? t('o.btnConfirmCod') : t('o.btnCorrect')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!statusConfirm}
        message={statusConfirm?.message}
        onConfirm={doStatusConfirm}
        onCancel={() => setStatusConfirm(null)}
      />

      <ConfirmModal
        open={!!cancelConfirm}
        message={cancelConfirm?.message}
        danger
        onConfirm={confirmCancelOrder}
        onCancel={() => setCancelConfirm(null)}
      />

      <ShippingSettingsModal
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        onSaved={showToast}
      />

      {toast && <div className="ao-toast">{toast}</div>}
    </div>
  );
}