// ໂຫລດຄຳສັ່ງຊື້ທັງໝົດຈາກ API
async function loadOrders() {
  const res = await fetch('/api/orders');
  const orders = await res.json();

  const container = document.getElementById('order-list');

  if (orders.length === 0) {
    container.innerHTML = '<p>ຍັງບໍ່ມີຄຳສັ່ງຊື້</p>';
    return;
  }

  container.innerHTML = `
    <table>
      <tr>
        <th>ລະຫັດ</th><th>ສິນຄ້າ</th><th>ຈຳນວນ</th><th>ລາຄາລວມ</th><th>ສະຖານະ</th><th>ວັນທີ</th><th></th>
      </tr>
      ${orders.map(o => `
        <tr>
          <td>${o.id}</td>
          <td>${o.product_name}</td>
          <td>${o.quantity}</td>
          <td>${o.price * o.quantity} ກີບ</td>
          <td>${statusLabel(o.status)}</td>
          <td>${new Date(o.created_at).toLocaleString('lo-LA')}</td>
          <td>
            ${o.status === 'pending' ? `<button class="delete-btn" onclick="completeOrder(${o.id})">ສຳເລັດ</button>` : ''}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
}

function statusLabel(status) {
  if (status === 'pending') return 'ລໍຖ້າ';
  if (status === 'completed') return 'ສຳເລັດແລ້ວ';
  return status;
}

async function completeOrder(id) {
  await fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  });
  loadOrders();
}

loadOrders();