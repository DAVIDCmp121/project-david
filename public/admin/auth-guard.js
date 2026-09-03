(async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) throw new Error();
    const admin = await res.json();

    // ຝາກ role ໄວ້ໃຫ້ໜ້າອື່ນເອາໄປໃຊ້ໄດ້ (ເຊັ່ນ staff.html ຈະເຊັກແລວເດັ້ງອອກຖ້າບໍ່ແມ່ນ admin)
    window.currentAdminRole = admin.role || 'admin';
    window.currentAdminName = admin.name;

    const roleLabel = window.currentAdminRole === 'admin' ? 'ແອດມິນ' : 'ພະນັກງານ';

    const bar = document.createElement('div');
    bar.style = 'display:flex;justify-content:flex-end;align-items:center;gap:12px;padding:8px 16px;background:#f2f2f2;';
    bar.innerHTML = `<span>ສະບາຍດີ, ${admin.name} (${roleLabel})</span><button id="logoutBtn" style="cursor:pointer;padding:6px 12px;">ອອກຈາກລະບົບ</button>`;
    document.body.prepend(bar);

    document.getElementById('logoutBtn').onclick = async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = window.currentAdminRole === 'admin' ? '/admin/login.html' : '/staff/login.html';
    };

    // ເຊື່ອງ nav link ຫຼືອງປະກອບໃດໆທີໝາຍ data-admin-only ຖ້າຄົນທີ່ login ບໍ່ແມ່ນ admin
    if (window.currentAdminRole !== 'admin') {
      document.querySelectorAll('[data-admin-only]').forEach(el => el.remove());
    }
  } catch {
    // ຖ້າ login ບໍ່ຜ່ານ ໃຫ້ເດງໄປໜ້າ login ທີ່ຖກຕ້ອງ (ເຊັກຈາກ URL ປດຈຸບັນ)
    const isStaffPath = window.location.pathname.startsWith('/staff');
    window.location.href = isStaffPath ? '/staff/login.html' : '/admin/login.html';
  }
})();