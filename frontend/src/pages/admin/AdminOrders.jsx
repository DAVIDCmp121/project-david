import { useEffect, useRef, useState } from 'react';
import { apiPost, apiPut, getAuthHeader } from '../../api.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';

// ลำดับขั้นตอนของออเดอร์
const FLOW = ['awaiting_review', 'confirmed', 'shipped', 'delivered'];

const statusLabels = {
  awaiting_review: 'ລໍຖ້າກວດສະລິບ',
  confirmed: 'ຢືນຢັນແລ້ວ',
  shipped: 'ຈັດສົ່ງແລ້ວ',
  delivered: 'ຮອດແລ້ວ',
};

// ปุ่มหลักที่จะขึ้นในแต่ละสถานะ (ขั้นถัดไป)
const NEXT = {
  confirmed: {
    to: 'shipped',
    label: 'ຈັດສົ່ງແລ້ວ',
    icon: '🚚',
    ask: (n) => `ຢືນຢັນວ່າຈັດສົ່ງອໍເດີ #${n} ແລ້ວ?`,
    done: (n) => `ອໍເດີ #${n} ຈັດສົ່ງແລ້ວ ✅`,
  },
  shipped: {
    to: 'delivered',
    label: 'ຮອດແລ້ວ',
    icon: '📦',
    ask: (n) => `ຢືນຢັນວ່າລູກຄ້າໄດ້ຮັບອໍເດີ #${n} ແລ້ວ?`,
    done: (n) => `ອໍເດີ #${n} ຮອດແລ້ວ ✅`,
  },
};

const cancelledByLabels = {
  customer: 'ລູກຄ້າຍົກເລີກ',
  staff: 'ພະນັກງານຍົກເລີກ',
};

const PAGE_SIZE = 20;

const CSS = `
.ao-root{font-family:inherit;color:#1f2937}
.ao-tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;scrollbar-width:thin}
.ao-tab{border:1px solid #e5e7eb;background:#fff;color:#374151;border-radius:999px;padding:8px 14px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:8px;font-size:.9rem;font-family:inherit}
.ao-tab.active{background:var(--blue,#2563eb);border-color:var(--blue,#2563eb);color:#fff}
.ao-tab .n{background:#f3f4f6;color:#4b5563;border-radius:999px;min-width:22px;height:22px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-size:.76rem;font-weight:700}
.ao-tab.active .n{background:rgba(255,255,255,.25);color:#fff}
.ao-tab .n.alert{background:#ef4444;color:#fff}
.ao-tab.cancel{margin-left:auto;border-style:dashed;color:#6b7280}
.ao-tab.cancel.active{color:#fff}

.ao-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.ao-filters input{margin:0;width:auto;padding:9px 14px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;box-sizing:border-box;font-size:.88rem;font-family:inherit}
.ao-filters .grow{flex:1 1 200px;min-width:0}
.ao-ghost{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:0 14px;height:38px;cursor:pointer;color:#374151;font-family:inherit}
.ao-count{font-size:.82rem;color:#6b7280;margin:0 2px 8px}

.ao-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:8px}
.ao-card.pending{border-left:4px solid #f59e0b}
.ao-main{display:grid;grid-template-columns:56px minmax(0,1fr) 130px 130px 190px;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;border-radius:12px}
.ao-main:hover{background:#fafafa}
.ao-num{font-weight:700;color:#6b7280}
.ao-items{font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-sub{font-size:.8rem;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-total{font-weight:700;text-align:right;white-space:nowrap}
.ao-actions{display:flex;gap:6px;justify-content:flex-end;align-items:center}

.ao-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.78rem;font-weight:700;white-space:nowrap}
.ao-st-awaiting_review{background:#fef3c7;color:#b45309}
.ao-st-confirmed{background:#dbeafe;color:#1d4ed8}
.ao-st-shipped{background:#ede9fe;color:#6d28d9}
.ao-st-delivered{background:#dcfce7;color:#15803d}
.ao-st-cancelled{background:#fee2e2;color:#b91c1c}

.ao-btn{border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer;color:#fff;white-space:nowrap;font-family:inherit;font-size:.86rem}
.ao-btn:disabled{opacity:.5;cursor:default}
.ao-btn.review{background:#16a34a}
.ao-btn.next-confirmed{background:var(--blue,#2563eb)}
.ao-btn.next-shipped{background:#7c3aed}
.ao-more{border:1px solid #e5e7eb;background:#fff;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:1.1rem;line-height:1;color:#4b5563;padding:0}
.ao-menu-wrap{position:relative}
.ao-menu{position:absolute;right:0;top:40px;z-index:20;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:200px;padding:4px}
.ao-menu button{display:block;width:100%;text-align:left;border:none;background:none;padding:9px 12px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:.88rem;color:#1f2937}
.ao-menu button:hover{background:#f3f4f6}
.ao-menu button.danger{color:#dc2626}
.ao-done{color:#15803d;font-weight:700;font-size:.86rem;padding-right:4px}
.ao-by{font-size:.78rem;color:#6b7280}

.ao-detail{border-top:1px solid #f0f0f0;padding:14px 16px 16px;background:#fcfcfd;border-radius:0 0 12px 12px;cursor:default}
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

.ao-loadmore{display:block;margin:12px auto;border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:10px 24px;cursor:pointer;font-family:inherit;color:#374151;font-weight:600}
.ao-empty{text-align:center;color:#9ca3af;padding:40px 10px}
.ao-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 18px;border-radius:999px;font-size:.9rem;z-index:3000;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:92%;text-align:center}

@media (max-width:760px){
  .ao-main{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"num info status" "total total actions";row-gap:8px}
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
// ຊື່ສິນຄ້າ + ໄຊສ໌ທີ່ເລືອກ (ຖ້າມີ) + ຈຳນວນ  ເຊັ່ນ  POLO (L) ×1
function itemLabel(it) {
  const sizePart = it.size ? ' (' + it.size + ')' : '';
  return it.product_name + sizePart + ' ×' + it.quantity;
}

function fmtMoney(n) {
  return `${Number(n || 0).toLocaleString('en-US')} ກີບ`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// วันที่ตามเวลาเครื่อง (แก้ปัญหาเขตเวลาของตัวกรองวันที่)
function localDateKey(str) {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function whenText(str) {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `ມື້ນີ້ ${time}`;
  if (d.toDateString() === yest.toDateString()) return `ມື້ວານ ${time}`;
  return `${d.toLocaleDateString('en-GB')} ${time}`;
}

function itemsSummary(o) {
  const items = o.items || [];
  if (items.length === 0) return '-';
  const first = itemLabel(items[0]);
  return items.length > 1 ? `${first} +${items.length - 1} ລາຍການ` : first;
}

function Steps({ status }) {
  const idx = FLOW.indexOf(status);
  return (
    <div className="ao-steps">
      {FLOW.map((s, i) => (
        <div key={s} className={`ao-step ${i <= idx ? 'done' : ''} ${i === idx ? 'now' : ''}`}>
          <span className="ao-dot">{i < idx ? '✓' : i + 1}</span>
          <span className="ao-slabel">{statusLabels[s]}</span>
        </div>
      ))}
    </div>
  );
}

const EMPTY_TEXT = {
  all: 'ຍັງບໍ່ມີອໍເດີ',
  awaiting_review: 'ບໍ່ມີອໍເດີທີ່ລໍຖ້າກວດສະລິບ 🎉',
  confirmed: 'ບໍ່ມີອໍເດີທີ່ລໍຖ້າຈັດສົ່ງ',
  shipped: 'ບໍ່ມີອໍເດີທີ່ກຳລັງຈັດສົ່ງ',
  delivered: 'ຍັງບໍ່ມີອໍເດີທີ່ຮອດແລ້ວ',
  cancelled: 'ບໍ່ມີອໍເດີທີ່ຍົກເລີກ',
};

// ---------- หน้าออเดอร์ ----------
export default function AdminOrders() {
  const [allOrders, setAllOrders] = useState([]);
  const [tab, setTab] = useState('all');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(null); // { id, to, message, okMsg }
  const [cancelConfirm, setCancelConfirm] = useState(null); // { id, message }
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders', {
        credentials: 'include',
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (Array.isArray(data)) setAllOrders(data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadOrders();
    return () => clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    setLimit(PAGE_SIZE);
    setExpandedId(null);
  }, [tab, searchPhone, filterDate]);

  // ปิดเมนู "⋯" เมื่อกดที่อื่น
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

  const orderNumbers = {};
  [...allOrders]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((o, idx) => {
      orderNumbers[o.id] = idx + 1;
    });

  // ---------- กรอง ----------
  let filtered = allOrders;
  if (searchPhone) {
    filtered = filtered.filter((o) => (o.customer_phone || '').includes(searchPhone.trim()));
  }
  if (filterDate) {
    filtered = filtered.filter((o) => localDateKey(o.created_at) === filterDate);
  }

  const active = filtered.filter((o) => o.order_status !== 'cancelled');
  const cancelled = filtered.filter((o) => o.order_status === 'cancelled');

  const counts = { all: active.length, cancelled: cancelled.length };
  FLOW.forEach((s) => {
    counts[s] = active.filter((o) => (o.order_status || 'awaiting_review') === s).length;
  });

  let list;
  if (tab === 'cancelled') list = cancelled;
  else if (tab === 'all') list = active;
  else list = active.filter((o) => (o.order_status || 'awaiting_review') === tab);

  const visible = list.slice(0, limit);

  // ---------- การทำงาน ----------
  async function changeStatus(id, to, okMsg) {
    setBusyId(id);
    try {
      const { data } = await apiPut(`/api/orders/${id}`, { order_status: to });
      if (!data.success) {
        alert(data.error || 'ປ່ຽນສະຖານະບໍ່ສຳເລັດ');
        return false;
      }
      await loadOrders();
      showToast(okMsg);
      return true;
    } catch (e) {
      alert('ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້');
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSlip(o) {
    const n = orderNumbers[o.id];
    const ok = await changeStatus(o.id, 'confirmed', `ອໍເດີ #${n} ຢືນຢັນແລ້ວ ✅ ຍ້າຍໄປແທັບ "ຢືນຢັນແລ້ວ"`);
    if (ok) setReviewOrder(null);
  }

  function askNext(o, st) {
    const cfg = NEXT[st];
    const n = orderNumbers[o.id];
    setStatusConfirm({ id: o.id, to: cfg.to, message: cfg.ask(n), okMsg: cfg.done(n) });
  }

  function doStatusConfirm() {
    const s = statusConfirm;
    setStatusConfirm(null);
    if (s) changeStatus(s.id, s.to, s.okMsg);
  }

  function adminCancelOrder(id) {
    setCancelConfirm({ id, message: 'ຢືນຢັນຍົກເລີກອໍເດີ? ສະຕັອກສິນຄ້າຈະຄືນກັບຄືນ' });
  }

  function rejectSlip(id) {
    setCancelConfirm({ id, message: 'ສະລິບບໍ່ຖືກຕ້ອງ ຢືນຢັນຍົກເລີກອໍເດີ? ສະຕັອກສິນຄ້າຈະຄືນກັບຄືນ' });
  }

  async function confirmCancelOrder() {
    const id = cancelConfirm.id;
    setCancelConfirm(null);
    setBusyId(id);
    try {
      const { data } = await apiPost(`/api/orders/${id}/admin-cancel`, {});
      if (!data.success) {
        alert(data.error || 'ຍົກເລີກບໍ່ສຳເລັດ');
        return;
      }
      setReviewOrder(null);
      await loadOrders();
      showToast(`ຍົກເລີກອໍເດີ #${orderNumbers[id]} ແລ້ວ`);
    } catch (e) {
      alert('ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້');
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setSearchPhone('');
    setFilterDate('');
  }

  // ---------- แสดงผลแถว ----------
  function renderRow(o) {
    const st = o.order_status || 'awaiting_review';
    const isCancelled = st === 'cancelled';
    const open = expandedId === o.id;
    const n = orderNumbers[o.id];
    const qty = (o.items || []).reduce((s, it) => s + it.quantity, 0);
    const busy = busyId === o.id;

    return (
      <div key={o.id} className={`ao-card ${st === 'awaiting_review' ? 'pending' : ''}`}>
        <div className="ao-main" onClick={() => setExpandedId(open ? null : o.id)}>
          <div className="ao-num">#{n}</div>

          <div className="ao-info">
            <div className="ao-items">{itemsSummary(o)}</div>
            <div className="ao-sub">
              {o.customer_phone || '-'} · {qty} ຊິ້ນ · {whenText(o.created_at)}
            </div>
          </div>

          <div className="ao-total">{fmtMoney(o.total)}</div>

          <div className="ao-status">
            <span className={`ao-badge ao-st-${st}`}>
              {isCancelled ? 'ຍົກເລີກແລ້ວ' : statusLabels[st] || st}
            </span>
          </div>

          <div className="ao-actions" onClick={(e) => e.stopPropagation()}>
            {isCancelled && <span className="ao-by">{cancelledByLabels[o.cancelled_by] || ''}</span>}

            {st === 'awaiting_review' && (
              <button className="ao-btn review" disabled={busy} onClick={() => setReviewOrder(o)}>
                ກວດສອບ
              </button>
            )}
            {NEXT[st] && (
              <button className={`ao-btn next-${st}`} disabled={busy} onClick={() => askNext(o, st)}>
                {NEXT[st].icon} {NEXT[st].label}
              </button>
            )}
            {st === 'delivered' && <span className="ao-done">✓ ສຳເລັດ</span>}

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
                        setReviewOrder(o);
                      }}
                    >
                      🔍 ເບິ່ງສະລິບ / ລາຍລະອຽດ
                    </button>
                    {st !== 'delivered' && (
                      <button
                        className="danger"
                        onClick={() => {
                          setMenuId(null);
                          adminCancelOrder(o.id);
                        }}
                      >
                        ✕ ຍົກເລີກອໍເດີ
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
            {!isCancelled && <Steps status={st} />}
            <div className="ao-dgrid">
              <div>
                <div className="ao-dlabel">ສິນຄ້າ</div>
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
                  <span>ລາຄາລວມ</span>
                  <span>{fmtMoney(o.total)}</span>
                </div>
              </div>
              <div>
                <div className="ao-dlabel">ເບີໂທ</div>
                <div className="ao-dval">{o.customer_phone || '-'}</div>
                <div className="ao-dlabel">ທີ່ຢູ່ຈັດສົ່ງ</div>
                <div className="ao-dval">{o.customer_address || '-'}</div>
                {o.slip_image && (
                  <>
                    <div className="ao-dlabel">ສະລິບ (ກົດເພື່ອຂະຫຍາຍ)</div>
                    <img className="ao-slip" src={o.slip_image} alt="slip" onClick={() => setReviewOrder(o)} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const tabs = [
    { key: 'all', label: 'ທັງໝົດ' },
    ...FLOW.map((s) => ({ key: s, label: statusLabels[s] })),
  ];

  const reviewStatus = reviewOrder ? reviewOrder.order_status || 'awaiting_review' : '';

  return (
    <div className="ao-root">
      <style>{CSS}</style>

      {/* ---------- แท็บตามขั้นตอน ---------- */}
      <div className="ao-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`ao-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className={`n ${t.key === 'awaiting_review' && counts.awaiting_review > 0 ? 'alert' : ''}`}>
              {counts[t.key]}
            </span>
          </button>
        ))}
        <button
          className={`ao-tab cancel ${tab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setTab('cancelled')}
        >
          ຍົກເລີກແລ້ວ
          <span className="n">{counts.cancelled}</span>
        </button>
      </div>

      {/* ---------- ตัวกรอง ---------- */}
      <div className="ao-filters">
        <input
          className="grow"
          type="text"
          placeholder="ຄົ້ນຫາດ້ວຍເບີໂທ..."
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
        />
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {(searchPhone || filterDate) && (
          <button className="ao-ghost" onClick={clearFilters}>ລ້າງຕົວກອງ</button>
        )}
        <button className="ao-ghost" onClick={loadOrders} title="ໂຫລດໃໝ່">↻</button>
      </div>
      <div className="ao-count">ພົບ {list.length} ລາຍການ</div>

      {/* ---------- รายการ ---------- */}
      {list.length === 0 ? (
        <div className="ao-empty">
          {searchPhone || filterDate ? 'ບໍ່ພົບອໍເດີທີ່ຕົງກັບການຄົ້ນຫາ' : EMPTY_TEXT[tab]}
        </div>
      ) : (
        <>
          {visible.map(renderRow)}
          {list.length > visible.length && (
            <button className="ao-loadmore" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              ສະແດງເພີ່ມ ({list.length - visible.length})
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
              {reviewStatus === 'awaiting_review' ? 'ກວດສອບສະລິບ' : 'ລາຍລະອຽດອໍເດີ'} #{orderNumbers[reviewOrder.id]}
            </h2>

            <p style={{ marginBottom: 4, fontSize: '0.9rem' }}><strong>ເບີໂທ:</strong> {reviewOrder.customer_phone || '-'}</p>
            <p style={{ marginBottom: 10, fontSize: '0.9rem' }}><strong>ທີ່ຢູ່ຈັດສົ່ງ:</strong> {reviewOrder.customer_address || '-'}</p>

            <div style={{ marginBottom: 6, fontSize: '0.9rem' }}>
              {(reviewOrder.items || []).map((it, i) => (
                <div key={i}>{itemLabel(it)}</div>
              ))}
            </div>
            <p style={{ marginBottom: 10, fontSize: '0.9rem' }}><strong>ລາຄາລວມ:</strong> {fmtMoney(reviewOrder.total)}</p>

            {reviewOrder.slip_image && (
              <img
                src={reviewOrder.slip_image}
                alt="slip"
                style={{ maxWidth: '100%', maxHeight: 220, width: 'auto', display: 'block', margin: '0 auto 14px', objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            )}

            {reviewStatus === 'awaiting_review' && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', position: 'sticky', bottom: 0, background: '#fff', paddingTop: 8 }}>
                <button className="cancel-btn" onClick={() => rejectSlip(reviewOrder.id)}>❌ ບໍ່ຖືກຕ້ອງ</button>
                <button className="primary" disabled={busyId === reviewOrder.id} onClick={() => confirmSlip(reviewOrder)}>✅ ຖືກຕ້ອງ</button>
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

      {toast && <div className="ao-toast">{toast}</div>}
    </div>
  );
}