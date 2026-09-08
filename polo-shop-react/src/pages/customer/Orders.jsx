import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../../api.js';

// ➕ ນຳຈາກ public/menu/orders.html

const statusLabels = {
  awaiting_review: 'ລໍຖ້າກວດສະລິບ',
  confirmed: 'ຢືນຢັນແລ້ວ',
  shipped: 'ຈັດສົ່ງແລ້ວ',
  delivered: 'ຮອດແລ້ວ',
  cancelled: 'ຍົກເລີກແລ້ວ',
};

export default function CustomerOrders() {
  const [orders, setOrders] = useState(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const navigate = useNavigate();

  async function load() {
    const res = await fetch('/api/customer/orders', { credentials: 'include' });
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

  async function cancelOrder(orderId) {
    if (!window.confirm('ຢືນຢັນຍົກເລີກອໍເດນີ້?')) return;
    const { data } = await apiPost(`/api/orders/${orderId}/cancel`, {});
    if (data.success) {
      load();
    } else {
      alert(data.error || 'ຍົກເລີກບໍ່ສຳເລັດ');
    }
  }

  if (!loggedIn) {
    navigate('/menu/login');
    return null;
  }

  return (
    <div className="customer-shell">
      <h1 style={{ textAlign: 'center', color: 'var(--gold)', padding: '20px 0 0' }}>ອໍເດີຂອງຂ້ອຍ</h1>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        {orders === null && <p style={{ color: '#999', textAlign: 'center' }}>ກຳລັງໂຫລດ...</p>}
        {orders && orders.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center' }}>ຍັງບໍ່ມີອໍເດີ</p>
        )}
        {orders && orders.length > 0 && (
          <table className="orders-table">
            <thead>
              <tr>
                <th>ວັນທີ່ສັ່ງ</th>
                <th>ສິນຄ້າ</th>
                <th>ລາຄາລວມ</th>
                <th>ສະຖານະ</th>
                <th>ເລກພັດສະດຸ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusKey = order.order_status || 'awaiting_review';
                const total = (order.price * order.quantity).toLocaleString();
                const dateStr = new Date(order.created_at).toLocaleDateString('lo-LA');
                return (
                  <tr key={order.id}>
                    <td>{dateStr}</td>
                    <td>{order.product_name || '-'}</td>
                    <td>{total} ກີບ</td>
                    <td><span className={`badge badge-${statusKey}`}>{statusLabels[statusKey] || statusKey}</span></td>
                    <td>{order.bill_number || '-'}</td>
                    <td>
                      <a className="chat-btn" href={`/menu/chat?orderId=${order.id}`}>ແຊັດ</a>
                      {statusKey === 'awaiting_review' && (
                        <button className="cancel-btn" onClick={() => cancelOrder(order.id)}>ຍົກເລີກ</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
