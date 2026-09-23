import { useEffect, useState } from 'react';
import { apiPost, apiPut } from '../../api.js';

// ➕ ນຳຈາກ public/admin/orders.html + orders.js (ເວຊນລາສດ ທມແທບ+ຕົວກອງ+dropdown)
// ✅ ອບເດດແລວ: ຮອງຮບ order.items (array) ແທນ product_name/quantity/price ດຽວໆ
// ✅ ອັບເດດໃໝ່: ເລກລດບ 1,2,3... ແທນ DB id (ນັບລວມທຸກອເດ ລວມທຍົກເລີກ) + ເສນຄັນລະຫວາງວນທີ

const statusLabels = {
  awaiting_review: 'ລຖາກວດສະລບ',
  confirmed: 'ຢືນຢັນແລວ',
  shipped: 'ຈດສງແລ້ວ',
  delivered: 'ຮອດແລ້ວ',
};

const cancelledByLabels = {
  customer: { text: 'ລກຄາຍກເລກ', cls: 'by-customer' },
  staff: { text: 'ພະນກງານຍົກເລີກ', cls: 'by-staff' },
};

export default function AdminOrders() {
  const [allOrders, setAllOrders] = useState([]);
  const [tab, setTab] = useState('inprogress');
  const [searchPhone, setSearchPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  async function loadOrders() {
    const res = await fetch('/api/orders', { credentials: 'include' });
    const data = await res.json();
    setAllOrders(data);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // ✅ ໃໝ່: ສາງເລກລດບ 1,2,3... ຈາກອເດທງໝົດ (ນບລວມທຍົກເລີກ), ອງໃສວນທສາງອເດ (ເກາສດ = 1)
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
  const inProgress = filterStatus === 'all'
    ? inProgressAll
    : inProgressAll.filter((o) => (o.order_status || 'awaiting_review') === filterStatus);

  async function updateStatus(id, order_status) {
    const { data } = await apiPut(`/api/orders/${id}`, { order_status });
    if (!data.success) alert(data.error || 'ປຽນສະຖານະບສເລດ');
    loadOrders();
  }

  async function adminCancelOrder(id) {
    if (!window.confirm('ຢືນຢັນຍກເລີກອເດນີ້? ສະຕອກສນຄາຈະຄນກບຄນ')) return;
    const { data } = await apiPost(`/api/orders/${id}/admin-cancel`, {});
    if (!data.success) {
      alert(data.error || 'ຍກເລີກບສເລັດ');
      return;
    }
    loadOrders();
  }

  function clearFilters() {
    setSearchPhone('');
    setFilterStatus('all');
    setFilterDate('');
  }

  // ✅ ໃໝ: ແປງວນທເປນ string ສນໆ ໃຊ້ປຽບທຽບວາວນປຽນບ
  function dateKey(dateStr) {
    return new Date(dateStr).toLocaleDateString('lo-LA', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const count = tab === 'inprogress' ? inProgress.length : cancelled.length;

  return (
    <div>
      <div className="tabs">
        <button className={`tab-btn ${tab === 'inprogress' ? 'active' : ''}`} onClick={() => setTab('inprogress')}>ກຳລັງດຳເນີນການ</button>
        <button className={`tab-btn ${tab === 'cancelled' ? 'active' : ''}`} onClick={() => setTab('cancelled')}>ຍົກເລີກແລ້ວ</button>
      </div>

      <div className="filter-bar">
        <input type="text" placeholder="ຄົ້ນຫາດ້ວຍເບີໂທ..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">ທຸກສະຖານະ</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        <button className="filter-clear-btn" onClick={clearFilters}>ລ້າງຕົວກອງ</button>
      </div>
      <div className="filter-count">ພົບ {count} ລາຍການ</div>

      {tab === 'inprogress' && (
        inProgress.length === 0 ? <p>ບໍ່ພົບອໍເດີທີ່ຕົງກັບການຄົ້ນຫາ</p> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ເບີໂທ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ສະຖານະ</th><th>ວັນທີ</th><th></th>
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
                        <td colSpan={8} style={{ background: '#f3f4f6', fontWeight: 'bold', padding: '6px 10px' }}>
                          📅 {currentDate}
                        </td>
                      </tr>
                    );
                    lastDate = currentDate;
                  }
                  const status = o.order_status || 'awaiting_review';
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
                      <td>
                        <select className="status-select" value={status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td>{new Date(o.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td><button className="cancel-btn" onClick={() => adminCancelOrder(o.id)}>ຍົກເລີກ</button></td>
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
                <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ເບີໂທ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ວັນທີ</th><th>ຍົກເລີກໂດຍ</th>
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
    </div>
  );
}