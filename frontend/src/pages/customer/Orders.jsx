import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, getAuthHeader } from '../../api.js';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider } from '../../context/CartContext.jsx';

const statusLabels = {
  awaiting_review: 'ລຖາກວດສະລບ',
  confirmed: 'ຢືນຢັນແລວ',
  shipped: 'ຈດສງແລ້ວ',
  delivered: 'ຮອດແລວ',
  cancelled: 'ຍກເລີກແລ້ວ',
};

function CustomerOrdersInner() {
  const [orders, setOrders] = useState(null);
  const [loggedIn, setLoggedIn] = useState(true);
  const navigate = useNavigate();

  async function load() {
    const res = await fetch('/api/customer/orders', {
      credentials: 'include',
      headers: { ...getAuthHeader() }, // ✅ ໃໝ່
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

  async function cancelOrder(orderId) {
    if (!window.confirm('ຢນຢັນຍົກເລີກອເດນ?')) return;
    const { data } = await apiPost(`/api/orders/${orderId}/cancel`, {});
    if (data.success) {
      load();
    } else {
      alert(data.error || 'ຍົກເລກບສຳເລດ');
    }
  }

  if (!loggedIn) {
    navigate('/menu/login');
    return null;
  }

  return (
    <div className="customer-shell">
      <h1 style={{ textAlign: 'center', color: 'var(--gold)', padding: '20px 0 0' }}>ອໍເດີຂອງຂ້ອຍ</h1>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 80px' }}>
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
                const dateStr = new Date(order.created_at).toLocaleDateString('lo-LA');
                return (
                  <tr key={order.id}>
                    <td>{dateStr}</td>
                    <td>
                      {(order.items || []).map((it, i) => (
                        <div key={i}>{it.product_name} ×{it.quantity}</div>
                      ))}
                    </td>
                    <td>{order.total} ກີບ</td>
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

      <BottomNav />
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