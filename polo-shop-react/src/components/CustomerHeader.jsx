import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api.js';

// ➕ ນມາຈາກ public/menu/account.js ຕນສະບບ (ໄຟລຈງ — ໄດຮບແລວ)
// ພດຕກສຄນ: ຖາຍງບ login ຈະ redirect ໄປ login.html ທນທ (ບແມນແຄໂຊວປມ login)

export default function CustomerHeader() {
  const [customer, setCustomer] = useState(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiGet('/api/customer-auth/me');
      if (!ok) {
        navigate('/menu/login', { replace: true });
        return;
      }
      setCustomer(data);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  async function handleLogout() {
    try {
      await apiPost('/api/customer-auth/logout', {});
    } catch (err) {}
    navigate('/menu/login');
  }

  if (!customer) return null;

  const label = customer.name || customer.phone;

  return (
    <div className="account-menu" ref={menuRef}>
      <button className="account-btn" onClick={() => setOpen((v) => !v)}>
        {label} ▾
      </button>
      {open && (
        <div className="account-dropdown">
          <div className="account-dropdown-name">{label}</div>
          <a href="/menu/chat" onClick={(e) => { e.preventDefault(); navigate('/menu/chat'); }}>
            ແຊັດກັບຮ້ານ
          </a>
          <a href="/menu/orders" onClick={(e) => { e.preventDefault(); navigate('/menu/orders'); }}>
            ປະຫວັດອໍເດີ
          </a>
          <button onClick={handleLogout}>ອອກຈາກລະບົບ</button>
        </div>
      )}
    </div>
  );
}