let currentProduct = null;
let currentQty = 1;

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();

  const container = document.getElementById('product-list');

  if (products.length === 0) {
    container.innerHTML = '<p>ຍັງບໍ່ມີສິນຄ້າ;</p>';
    return;
  }

  window.allProducts = products;

  container.innerHTML = products.map(p => `
    <div class="product-card">
      ${p.image ? `<img src="${p.image}" class="product-img">` : ''}
      <h3>${p.name}</h3>
      <p>ໄຊສ໌: ${p.size} | ສີ: ${p.color}</p>
      <p>ເຫຼືອ: ${p.stock} ອັນ</p>
      <p class="price">${p.price} ກີບ</p>
      <button onclick="openCheckout(${p.id})" ${p.stock <= 0 ? 'disabled' : ''}>
        ${p.stock <= 0 ? 'ສິນຄ້າໝົດ' : 'ສັ່ງຊື້'}
      </button>
    </div>
  `).join('');
}

function openCheckout(id) {
  currentProduct = window.allProducts.find(p => p.id === id);
  currentQty = 1;
  updateCheckoutView();
  document.getElementById('checkout-overlay').classList.remove('hidden');
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.add('hidden');
  currentProduct = null;
}

function changeQty(delta) {
  const newQty = currentQty + delta;
  if (newQty < 1) return;
  if (newQty > currentProduct.stock) return;
  currentQty = newQty;
  updateCheckoutView();
}

function updateCheckoutView() {
  document.getElementById('checkout-img').src = currentProduct.image || '';
  document.getElementById('checkout-name').textContent = currentProduct.name;
  document.getElementById('checkout-price').textContent = currentProduct.price + ' ກີບ / ອັນ';
  document.getElementById('checkout-qty').textContent = currentQty;
  document.getElementById('checkout-total-price').textContent = (currentProduct.price * currentQty) + ' ກີບ';
}

async function confirmOrder() {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: currentProduct.id, quantity: currentQty })
  });

  const data = await res.json();

  if (res.ok) {
    closeCheckout();
    alert('ຊຳລະເງິນສຳເລັດ ຂອບໃຈທີ່ອຸດໜູນ! ✅');
    loadProducts();
  } else {
    alert('ເກີດຂໍ້ຜິດພາດ: ' + data.error);
  }
}

loadProducts();