import { useEffect, useState } from 'react';

// ➕ ນຳມາຈາກ public/admin/customers.html ຕົ້ນສະບັບ (ໄຟລ໌ຈິງ — ໄດ້ຮັບແລ້ວ)

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);

  async function loadCustomers() {
    const res = await fetch('/api/customers', { credentials: 'include' });
    const data = await res.json();
    setCustomers(data.customers || []);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function resetPin(id, phone) {
    if (!window.confirm(`ຢືນຢັນຣີເຊັດ PIN ຂອງເບີ ${phone}?`)) return;
    try {
      const res = await fetch(`/api/customers/${id}/reset-pin`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        alert(`PIN ໃໝ່ຂອງລູກຄ້າ ${phone} ຄື: ${data.newPin}\n\nກະລຸນາບອກລູກຄ້າຜ່ານແຊັດ/ໂທລະສັບ`);
      } else {
        alert(data.error || 'ຣີເຊັດບໍ່ສຳເລັດ');
      }
    } catch (err) {
      alert('ເກີດຂໍ້ຜິດພາດ');
    }
  }

  return (
    <div className="admin-card">
      <div style={{ color: '#6b7280', marginBottom: 12, fontSize: '0.9rem' }}>
        ລູກຄ້າສະໝັກແລ້ວທັງໝົດ: {customers.length} ຄົນ
      </div>
      <table className="admin-table">
        <thead>
          <tr><th>ຊື່</th><th>ເບີໂທ</th><th>ຈຳນວນອໍເດີ</th><th>ສະໝັກເມື່ອ</th><th></th></tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name || '-'}</td>
              <td>{c.phone}</td>
              <td>{c.order_count}</td>
              <td>{new Date(c.created_at).toLocaleDateString('lo-LA')}</td>
              <td><button className="primary" onClick={() => resetPin(c.id, c.phone)}>ຣີເຊັດ PIN</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}