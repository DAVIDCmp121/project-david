import { useEffect, useState } from 'react';
import { usePageT } from '../../useT.js';
import customersDict from '../../locales/customers.js';

// ➕ ນຳມາຈາກ public/admin/customers.html ຕົ້ນສະບັບ (ໄຟລ໌ຈິງ — ໄດ້ຮັບແລ້ວ)

export default function AdminCustomers() {
  const { t, locale } = usePageT(customersDict);
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
    if (!window.confirm(t('cu.confirmReset', { phone }))) return;
    try {
      const res = await fetch(`/api/customers/${id}/reset-pin`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        alert(t('cu.newPin', { phone, pin: data.newPin }));
      } else {
        alert(data.error || t('cu.errReset'));
      }
    } catch (err) {
      alert(t('cu.errGeneric'));
    }
  }

  return (
    <div className="admin-card">
      <div style={{ color: '#6b7280', marginBottom: 12, fontSize: '0.9rem' }}>
        {t('cu.total', { n: customers.length })}
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('cu.thName')}</th>
            <th>{t('cu.thPhone')}</th>
            <th>{t('cu.thOrders')}</th>
            <th>{t('cu.thJoined')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name || '-'}</td>
              <td>{c.phone}</td>
              <td>{c.order_count}</td>
              <td>{new Date(c.created_at).toLocaleDateString(locale)}</td>
              <td><button className="primary" onClick={() => resetPin(c.id, c.phone)}>{t('cu.resetPin')}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}