import { useNavigate } from 'react-router-dom';
import BannerCarousel from './BannerCarousel.jsx';
import { API_BASE } from '../api.js';

// ແບນເນີຫຼັກ (ເລື່ອນເອງ) + ແບນເນີຂາງ 2 ຊ່ອງ (ບໍ່ເລື່ອນ) ແບບ Shopee
export default function HomeHero({ banners }) {
  const navigate = useNavigate();

  const main = banners.filter((b) => (b.slot || 'main') === 'main');
  const sides = ['side1', 'side2']
    .map((s) => banners.find((b) => b.slot === s))
    .filter(Boolean);

  // ຕອງມແບນເນີຫຼັກຢາງໜອຍ 1 ຮບ ຈງສະແດງ
  if (main.length === 0) return null;

  return (
    <div className={`hm-hero ${sides.length > 0 ? 'has-side' : ''}`}>
      <div className="hm-hero-main">
        <BannerCarousel banners={main} />
      </div>

      {sides.length > 0 && (
        <div className="hm-side">
          {sides.map((b) => (
            <div
              key={b.id}
              className="hm-side-item"
              style={{ cursor: b.link_product_id ? 'pointer' : 'default' }}
              onClick={() => b.link_product_id && navigate(`/menu/product/${b.link_product_id}`)}
            >
              <img src={`${API_BASE}${b.image_url}`} alt="" draggable={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}