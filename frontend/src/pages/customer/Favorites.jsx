import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiDelete } from '../../api';

function FavoritesInner() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await apiGet('/api/favorites');
      setFavorites(res.ok && Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setFavorites([]);
    }
  }

  async function removeFavorite(productId) {
    setFavorites((prev) => (prev || []).filter((p) => p.id !== productId));
    try {
      await apiDelete(`/api/favorites/${productId}`);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="customer-shell">
      <TopBar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/menu/profile')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 30,
              lineHeight: 1,
              padding: '0 8px 4px 0',
              cursor: 'pointer',
              color: 'var(--cust-text)',
            }}
          >
            ‹
          </button>
          <h1 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--cust-text)' }}>ສິນຄ້າທີ່ຖືກໃຈ</h1>
        </div>

        {favorites === null && <p style={{ color: 'var(--cust-text-muted)' }}>ກຳລັງໂຫລດ...</p>}
        {favorites && favorites.length === 0 && (
          <p style={{ color: 'var(--cust-text-muted)' }}>ຍັງບໍ່ໄດ້ກົດຖືກໃຈສິນຄ້າໃດ</p>
        )}
        {favorites && favorites.length > 0 && (
          <div className="product-grid">
            {favorites.map((p) => (
              <div className="product-card" key={p.id}>
                <div onClick={() => navigate(`/menu/product/${p.id}`)} style={{ cursor: 'pointer' }}>
                  {p.image && <img src={`${API_BASE}${p.image}`} className="product-img" alt={p.name} />}
                  <h3>{p.name}</h3>
                  <p className="price">{p.price} ກີບ</p>
                </div>
                <button onClick={() => removeFavorite(p.id)} style={{ width: '100%' }}>
                  💔 ເອົາອອກ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Favorites() {
  return (
    <CartProvider>
      <FavoritesInner />
    </CartProvider>
  );
}