// public/menu/account.js
// ເຊັກສະຖານະ login (ຖ້າຍັງບໍ່ login ໃຫ້ເດັ້ງໄປ login.html) + render dropdown ຊື່ລູກຄ້າ

const accountArea = document.getElementById('accountArea');

async function loadAccountState() {
  try {
    const res = await fetch('/api/customer-auth/me', { credentials: 'include' });
    if (!res.ok) {
      window.location.href = 'login.html';
      return;
    }
    const data = await res.json();
    renderLoggedIn(data);
  } catch (err) {
    window.location.href = 'login.html';
  }
}

function renderLoggedIn(customer) {
  const label = customer.name || customer.phone;
  accountArea.innerHTML = `
    <div class="account-menu">
      <button class="account-btn" onclick="toggleAccountDropdown()">${escapeHtml(label)} ▾</button>
      <div id="accountDropdown" class="account-dropdown" style="display:none;">
        <div class="account-dropdown-name">${escapeHtml(label)}</div>
        <a href="chat.html">ແຊັດກັບຮ້ານ</a>
        <a href="orders.html">ປະຫວັດອໍເດີ</a>
        <button onclick="doLogout()">ອອກຈາກລະບົບ</button>
      </div>
    </div>
  `;
}

function toggleAccountDropdown() {
  const dd = document.getElementById('accountDropdown');
  dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', (e) => {
  const menu = document.querySelector('.account-menu');
  if (menu && !menu.contains(e.target)) {
    const dd = document.getElementById('accountDropdown');
    if (dd) dd.style.display = 'none';
  }
});

async function doLogout() {
  try {
    await fetch('/api/customer-auth/logout', { method: 'POST', credentials: 'include' });
  } catch (err) {}
  window.location.href = 'login.html';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadAccountState();