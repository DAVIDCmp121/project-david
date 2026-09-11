import { useEffect, useState } from 'react';
import { apiPost, apiPut } from '../../api.js';

// ➕ ນຳຈາກ public/admin/orders.html + orders.js (ເວີຊັນລ່າສຸດ ທີ່ມີແທັບ+ຕົວກອງ+dropdown)

const statusLabels = {
  awaiting_review: 'ລໍຖ້າກວດສະລິບ',
  confirmed: 'ຢືນຢັນແລ້ວ',
  shipped: 'ຈັດສົ່ງແລ້ວ',
  delivered: 'ຮອດແລ້ວ',
};

const cancelledByLabels = {
  customer: { text: 'ລູກຄ້າຍົກເລີກ', cls: 'by-customer' },
  staff: { text: 'ພະນັກງານຍົກເລີກ', cls: 'by-staff' },
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
    if (!data.success) alert(data.error || 'ປ່ຽນສະຖານະບໍ່ສຳເລັດ');
    loadOrders();
  }

  async function adminCancelOrder(id) {
    if (!window.confirm('ຢືນຢັນຍົກເລີກອໍເດີນີ້? ສະຕ໋ອກສິນຄ້າຈະຄືນກັບຄືນ')) return;
    const { data } = await apiPost(`/api/orders/${id}/admin-cancel`, {});
    if (!data.success) {
      alert(data.error || 'ຍົກເລີກບໍ່ສຳເລັດ');
      return;
    }
    loadOrders();
  }

  function clearFilters() {
    setSearchPhone('');
    setFilterStatus('all');
    setFilterDate('');
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
              {inProgress.map((o) => {
                const status = o.order_status || 'awaiting_review';
                return (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.product_name}</td>
                    <td>{o.customer_phone || '-'}</td>
                    <td>{o.quantity}</td>
                    <td>{o.price * o.quantity} ກີບ</td>
                    <td>
                      <select className="status-select" value={status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(o.created_at).toLocaleString('lo-LA')}</td>
                    <td><button className="cancel-btn" onClick={() => adminCancelOrder(o.id)}>ຍົກເລີກ</button></td>
                  </tr>
                );
              })}
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
              {cancelled.map((o) => {
                const badge = cancelledByLabels[o.cancelled_by];
                return (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.product_name}</td>
                    <td>{o.customer_phone || '-'}</td>
                    <td>{o.quantity}</td>
                    <td>{o.price * o.quantity} ກີບ</td>
                    <td>{new Date(o.created_at).toLocaleString('lo-LA')}</td>
                    <td>{badge ? <span className={`cancelled-by-badge ${badge.cls}`}>{badge.text}</span> : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
