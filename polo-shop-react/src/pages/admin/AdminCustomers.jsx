import { useEffect, useState } from 'react';
import { apiPost } from '../../api.js';

// ⚠️ ໝາຍເຫດ: ໄຟລ໌ public/admin/customers.html ຕົ້ນສະບັບ ບໍ່ເຄີຍຖືກສົ່ງມາໃຫ້ເບິ່ງທັງໝົດ
// Component ນີ້ສ້າງຂຶ້ນຕາມຄຸນສົມບັດທີ່ໄດ້ອະທິບາຍໄວ້ (ລາຍຊື່ລູກຄ້າ+ຈຳນວນອໍເດີ, ປຸ່ມຣີເຊັດ PIN)
// ຊື່ endpoint (/api/customers, POST /api/customers/:id/reset-pin) ເປັນການສົມມຸດ — ກະລຸນາກວດສອບ

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [newPinFor, setNewPinFor] = useState(null);

  async function load() {
    const res = await fetch('/api/customers', { credentials: 'include' });
    const data = await res.json();
    setCustomers(data.customers || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function resetPin(id, label) {
    if (!window.confirm(`ຢືນຢັນຣີເຊັດ PIN ຂອງ "${label}"?`)) return;
    const { data } = await apiPost(`/api/customers/${id}/reset-pin`, {});
    if (data.success) {
      setNewPinFor({ id, pin: data.newPin || data.new_pin });
    } else {
      alert(data.error || 'ຣີເຊັດ PIN ບໍ່ສຳເລັດ');
    }
  }

  return (
    <div className="admin-card">
      <h2>ລາຍຊື່ລູກຄ້າ</h2>
      {customers.length === 0 && <p>ຍັງບໍ່ມີລູກຄ້າ</p>}
      {customers.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr><th>ຊື່</th><th>ເບີໂທ</th><th>ຈຳນວນອໍເດີ</th><th></th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name || '-'}</td>
                <td>{c.phone}</td>
                <td>{c.order_count ?? 0}</td>
                <td>
                  <button className="primary" onClick={() => resetPin(c.id, c.name || c.phone)}>ຣີເຊັດ PIN</button>
                  {newPinFor?.id === c.id && (
                    <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#2563eb' }}>
                      PIN ໃໝ່: <b>{newPinFor.pin}</b>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
