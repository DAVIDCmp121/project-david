import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../../components/CustomerHeader.jsx';
import { API_BASE } from '../../api';

// ➕ ນຳຈາກ public/menu/script.js (loadProducts + openCheckout) ມາເຮັດເປັນ React component

export default function ProductList() {
  const [products, setProducts] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    })();
  }, []);

  function openCheckout(product) {
    sessionStorage.setItem('checkoutProduct', JSON.stringify(product));
    navigate('/menu/checkout');
  }

  return (
    <div className="customer-shell">
      <header className="customer-header">
        <div className="header-top">
          <div>
            <h1>POLO SHOP</h1>
            <p>ເລືອກຊື້ເສື້ອຜ້າສະໄຕລ໌ທັນສະໄໝ ຄຸນະພາບດີ</p>
          </div>
          <CustomerHeader />
        </div>
      </header>

      <main>
        {products === null && <p style={{ padding: 20, color: '#ccc' }}>ກຳລັງໂຫລດ...</p>}
        {products && products.length === 0 && (
          <p style={{ padding: 20, color: '#ccc' }}>ຍັງບໍ່ມີສິນຄ້າ</p>
        )}
        {products && products.length > 0 && (
          <div className="product-grid">
            {products.map((p) => (
              <div className="product-card" key={p.id}>
                {p.image && <img src={`${API_BASE}${p.image}`} className="product-img" alt={p.name} />}
                <h3>{p.name}</h3>
                <p>ໄຊສ໌: {p.size} | ສີ: {p.color}</p>
                <p>ເຫຼືອ: {p.stock} ອັນ</p>
                <p className="price">{p.price} ກີບ</p>
                <button disabled={p.stock <= 0} onClick={() => openCheckout(p)}>
                  {p.stock <= 0 ? 'ສິນຄ້າໝົດ' : 'ຊື້ເລີຍ'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
