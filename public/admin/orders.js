const statusLabels = {
  awaiting_review: 'ລໍຖ້າກວດສະລິບ',
  confirmed: 'ຢືນຢັນແລ້ວ',
  shipped: 'ຈັດສົ່ງແລ້ວ',
  delivered: 'ຮອດແລ້ວ'
};

const cancelledByLabels = {
  customer: '<span class="cancelled-by-badge by-customer">ລູກຄ້າຍົກເລີກ</span>',
  staff: '<span class="cancelled-by-badge by-staff">ພະນັກງານຍົກເລີກ</span>'
};

let allOrders = [];
let currentTab = 'inprogress';

async function loadOrders() {
  const res = await fetch('/api/orders', { credentials: 'include' });
  allOrders = await res.json();
  applyFilters();
}

// ➕ ນຳຕົວກອງ (ເບີໂທ / ສະຖານະ / ວັນທີ) ມາໃຊ້ ແລ້ວແຍກ 2 ແທັບ
function applyFilters() {
  const phoneQuery = document.getElementById('search-phone').value.trim();
  const statusFilter = document.getElementById('filter-status').value;
  const dateFilter = document.getElementById('filter-date').value;

  let filtered = allOrders;

  if (phoneQuery) {
    filtered = filtered.filter(o => (o.customer_phone || '').includes(phoneQuery));
  }
  if (dateFilter) {
    filtered = filtered.filter(o => {
      const orderDate = new Date(o.created_at).toISOString().slice(0, 10);
      return orderDate === dateFilter;
    });
  }

  const inProgress = filtered.filter(o => o.order_status !== 'cancelled');
  const cancelled = filtered.filter(o => o.order_status === 'cancelled');

  const finalInProgress = statusFilter === 'all'
    ? inProgress
    : inProgress.filter(o => (o.order_status || 'awaiting_review') === statusFilter);

  renderInProgress(finalInProgress);
  renderCancelled(cancelled);

  const countEl = document.getElementById('filter-count');
  const total = currentTab === 'inprogress' ? finalInProgress.length : cancelled.length;
  countEl.textContent = `ພົບ ${total} ລາຍການ`;
}

function clearFilters() {
  document.getElementById('search-phone').value = '';
  document.getElementById('filter-status').value = 'all';
  document.getElementById('filter-date').value = '';
  applyFilters();
}

function renderInProgress(orders) {
  const container = document.getElementById('order-list-inprogress');
  if (orders.length === 0) {
    container.innerHTML = '<p>ບໍ່ພົບອໍເດີທີ່ຕົງກັບການຄົ້ນຫາ</p>';
    return;
  }

  container.innerHTML = `
    <table>
      <tr>
        <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ເບີໂທ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ສະຖານະ</th><th>ວັນທີ</th><th></th>
      </tr>
      ${orders.map(o => {
        const status = o.order_status || 'awaiting_review';
        return `
        <tr>
          <td>${o.id}</td>
          <td>${o.product_name}</td>
          <td>${o.customer_phone || '-'}</td>
          <td>${o.quantity}</td>
          <td>${o.price * o.quantity} ກີບ</td>
          <td>
            <select class="status-select" onchange="updateStatus(${o.id}, this.value)">
              ${Object.entries(statusLabels).map(([key, label]) =>
                `<option value="${key}" ${status === key ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </td>
          <td>${new Date(o.created_at).toLocaleString('lo-LA')}</td>
          <td><button class="cancel-btn" onclick="adminCancelOrder(${o.id})">ຍົກເລີກ</button></td>
        </tr>`;
      }).join('')}
    </table>
  `;
}

function renderCancelled(orders) {
  const container = document.getElementById('order-list-cancelled');
  if (orders.length === 0) {
    container.innerHTML = '<p>ບໍ່ພົບອໍເດີທີ່ຕົງກັບການຄົ້ນຫາ</p>';
    return;
  }

  container.innerHTML = `
    <table>
      <tr>
        <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ເບີໂທ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ວັນທີ</th><th>ຍົກເລີກໂດຍ</th>
      </tr>
      ${orders.map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${o.product_name}</td>
          <td>${o.customer_phone || '-'}</td>
          <td>${o.quantity}</td>
          <td>${o.price * o.quantity} ກີບ</td>
          <td>${new Date(o.created_at).toLocaleString('lo-LA')}</td>
          <td>${cancelledByLabels[o.cancelled_by] || '-'}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function switchTab(tab) {
  currentTab = tab;
  const isInProgress = tab === 'inprogress';
  document.getElementById('tab-inprogress').classList.toggle('active', isInProgress);
  document.getElementById('tab-cancelled').classList.toggle('active', !isInProgress);
  document.getElementById('order-list-inprogress').classList.toggle('hidden', !isInProgress);
  document.getElementById('order-list-cancelled').classList.toggle('hidden', isInProgress);
  applyFilters();
}

async function updateStatus(id, order_status) {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ order_status })
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'ປ່ຽນສະຖານະບໍ່ສຳເລັດ');
    }
    loadOrders();
  } catch (err) {
    alert('ເກີດຂໍ້ຜດພາດ');
  }
}

async function adminCancelOrder(id) {
  if (!confirm('ຢືນຢັນຍົກເລີກອໍເດີນີ້? ສະຕ໋ອກສິນຄ້າຈະຄືນກັບຄືນ')) return;

  try {
    const res = await fetch(`/api/orders/${id}/admin-cancel`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'ຍົກເລີກບໍ່ສຳເລດ');
      return;
    }
    loadOrders();
  } catch (err) {
    alert('ເກີດຂໍ້ຜິດພາດ');
  }
}

loadOrders();