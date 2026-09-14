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
  const product = window.allProducts.find(p => p.id === id);
  sessionStorage.setItem('checkoutProduct', JSON.stringify(product));
  window.location.href = 'checkout.html';
}

loadProducts();