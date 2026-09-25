import { useEffect, useState } from 'react';
import { apiPost, apiPut, getAuthHeader } from '../../api.js';

const statusLabels = {
  awaiting_review: 'ລຖາກວດສະລບ',
  confirmed: 'ຢນຢນແລວ',
  shipped: 'ຈດສງແລ້ວ',
  delivered: 'ຮອດແລວ',
};

const cancelledByLabels = {
  customer: { text: 'ລກຄາຍກເລກ', cls: 'by-customer' },
  staff: { text: 'ພະນັກງານຍົກເລີກ', cls: 'by-staff' },
};

export default function AdminOrders() {
  const [allOrders, setAllOrders] = useState([]);
  const [tab, setTab] = useState('inprogress');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [reviewOrder, setReviewOrder] = useState(null);

  async function loadOrders() {
    const res = await fetch('/api/orders', {
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    const data = await res.json();
    setAllOrders(data);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const orderNumbers = {};
  [...allOrders]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((o, idx) => {
      orderNumbers[o.id] = idx + 1;
    });

  let filtered = allOrders;
  if (searchPhone) {
    filtered = filtered.filter((o) => (o.customer_phone || '').includes(searchPhone));
  }
  if (filterDate) {
    filtered = filtered.filter((o) => new Date(o.created_at).toISOString().slice(0, 10) === filterDate);
  }

  const inProgressAll = filtered.filter((o) => o.order_status !== 'cancelled');
  const cancelled = filtered.filter((o) => o.order_status === 'cancelled');

  let inProgress;
  if (tab === 'inprogress') {
    inProgress = inProgressAll;
  } else if (Object.prototype.hasOwnProperty.call(statusLabels, tab)) {
    inProgress = inProgressAll.filter((o) => (o.order_status || 'awaiting_review') === tab);
  } else {
    inProgress = [];
  }

  const showInProgressTable = tab !== 'cancelled';

  async function updateStatus(id, order_status) {
    const { data } = await apiPut(`/api/orders/${id}`, { order_status });
    if (!data.success) alert(data.error || 'ປຽນສະຖານະບສເລດ');
    loadOrders();
  }

  async function adminCancelOrder(id) {
    if (!window.confirm('ຢນຢນຍົກເລກອເດນີ? ສະຕອກສນຄ້າຈະຄນກບຄນ')) return;
    const { data } = await apiPost(`/api/orders/${id}/admin-cancel`, {});
    if (!data.success) {
      alert(data.error || 'ຍົກເລກບສເລດ');
      return;
    }
    setReviewOrder(null);
    loadOrders();
  }

  async function confirmSlip(id) {
    const { data } = await apiPut(`/api/orders/${id}`, { order_status: 'confirmed' });
    if (!data.success) {
      alert(data.error || 'ປຽນສະຖານະບສເລັດ');
      return;
    }
    setReviewOrder(null);
    loadOrders();
  }

  function rejectSlip(id) {
    if (!window.confirm('ສະລບບຖືກຕອງ ຢນຢນຍກເລກອເດນ? ສະຕອກສນຄາຈະຄືນກບຄນ')) return;
    adminCancelOrder(id);
  }

  function clearFilters() {
    setSearchPhone('');
    setFilterDate('');
  }

  function dateKey(dateStr) {
    return new Date(dateStr).toLocaleDateString('lo-LA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const count = showInProgressTable ? inProgress.length : cancelled.length;

  return (
    <div>
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        <button className={`tab-btn ${tab === 'inprogress' ? 'active' : ''}`} onClick={() => setTab('inprogress')}>ກຳລັງດຳເນີນການ</button>
        <button className={`tab-btn ${tab === 'cancelled' ? 'active' : ''}`} onClick={() => setTab('cancelled')}>ຍົກເລີກແລ້ວ</button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="ຄົ້ນຫາດ້ວຍເບີໂທ..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} />
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        <button className="filter-clear-btn" onClick={clearFilters}>ລ້າງຕົວກອງ</button>
      </div>
      <div className="filter-count">ພົບ {count} ລາຍການ</div>

      {showInProgressTable && (
        inProgress.length === 0 ? <p>ບໍ່ພົບອໍເດີທີ່ຕົງກັບການຄົ້ນຫາ</p> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ເບີໂທ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ເວລາ</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastDate = null;
                const rows = [];
                inProgress.forEach((o) => {
                  const currentDate = dateKey(o.created_at);
                  if (currentDate !== lastDate) {
                    rows.push(
                      <tr key={`divider-${currentDate}`} className="order-date-divider">
                        <td colSpan={7} style={{ background: '#f3f4f6', fontWeight: 'bold', padding: '6px 10px' }}>
                          📅 {currentDate}
                        </td>
                      </tr>
                    );
                    lastDate = currentDate;
                  }
                  rows.push(
                    <tr key={o.id}>
                      <td>{orderNumbers[o.id]}</td>
                      <td>
                        {(o.items || []).map((it, i) => (
                          <div key={i}>{it.product_name} ×{it.quantity}</div>
                        ))}
                      </td>
                      <td>{o.customer_phone || '-'}</td>
                      <td>{(o.items || []).reduce((s, it) => s + it.quantity, 0)}</td>
                      <td>{o.total} ກີບ</td>
                      <td>{new Date(o.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
                          onClick={() => setReviewOrder(o)}
                        >
                          ກວດສອບ
                        </button>
                        <button className="cancel-btn" onClick={() => adminCancelOrder(o.id)} style={{ marginLeft: 4 }}>ຍົກເລີກ</button>
                      </td>
                    </tr>
                  );
                });
                return rows;
              })()}
            </tbody>
          </table>
        )
      )}

      {tab === 'cancelled' && (
        cancelled.length === 0 ? <p>ບໍ່ພົບອໍເດີທີ່ຕົງກັບການຄົ້ນຫາ</p> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ເບີໂທ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ເວລາ</th><th>ຍົກເລີກໂດຍ</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastDate = null;
                const rows = [];
                cancelled.forEach((o) => {
                  const currentDate = dateKey(o.created_at);
                  if (currentDate !== lastDate) {
                    rows.push(
                      <tr key={`divider-${currentDate}`} className="order-date-divider">
                        <td colSpan={7} style={{ background: '#f3f4f6', fontWeight: 'bold', padding: '6px 10px' }}>
                          📅 {currentDate}
                        </td>
                      </tr>
                    );
                    lastDate = currentDate;
                  }
                  const badge = cancelledByLabels[o.cancelled_by];
                  rows.push(
                    <tr key={o.id}>
                      <td>{orderNumbers[o.id]}</td>
                      <td>
                        {(o.items || []).map((it, i) => (
                          <div key={i}>{it.product_name} ×{it.quantity}</div>
                        ))}
                      </td>
                      <td>{o.customer_phone || '-'}</td>
                      <td>{(o.items || []).reduce((s, it) => s + it.quantity, 0)}</td>
                      <td>{o.total} ກີບ</td>
                      <td>{new Date(o.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{badge ? <span className={`cancelled-by-badge ${badge.cls}`}>{badge.text}</span> : '-'}</td>
                    </tr>
                  );
                });
                return rows;
              })()}
            </tbody>
          </table>
        )
      )}

      {reviewOrder && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setReviewOrder(null); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setReviewOrder(null)}>✕</button>
            <h2 style={{ color: 'var(--navy)', fontSize: '1.1rem' }}>ກວດສອບສະລິບ #{orderNumbers[reviewOrder.id]}</h2>

            <p style={{ marginBottom: 4, fontSize: '0.9rem' }}><strong>ເບີໂທ:</strong> {reviewOrder.customer_phone || '-'}</p>
            <p style={{ marginBottom: 10, fontSize: '0.9rem' }}><strong>ທີ່ຢູ່ຈັດສົ່ງ:</strong> {reviewOrder.customer_address || '-'}</p>

            <div style={{ marginBottom: 6, fontSize: '0.9rem' }}>
              {(reviewOrder.items || []).map((it, i) => (
                <div key={i}>{it.product_name} ×{it.quantity}</div>
              ))}
            </div>
            <p style={{ marginBottom: 10, fontSize: '0.9rem' }}><strong>ລາຄາລວມ:</strong> {reviewOrder.total} ກີບ</p>

            {reviewOrder.slip_image && (
              <img
                src={reviewOrder.slip_image}
                alt="slip"
                style={{ maxWidth: '100%', maxHeight: 220, width: 'auto', display: 'block', margin: '0 auto 14px', objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', position: 'sticky', bottom: 0, background: '#fff', paddingTop: 8 }}>
              <button className="primary" onClick={() => confirmSlip(reviewOrder.id)}>✅ ຖືກຕ້ອງ</button>
              <button className="cancel-btn" onClick={() => rejectSlip(reviewOrder.id)}>❌ ບໍ່ຖືກຕ້ອງ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}