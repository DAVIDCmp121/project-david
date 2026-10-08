import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../api.js';

const SLIDE_MS = 2000; // เลื่อนเองทุก 2 วินาที

export default function BannerCarousel({ banners }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const count = banners.length;

  // ถ้าจนวนแบนเนอร์ลดลง (แอดมินลบ) ให้กลับไปรปแรก
  useEffect(() => {
    if (idx >= count) setIdx(0);
  }, [count, idx]);

  useEffect(() => {
    if (count <= 1 || paused) return undefined;
    const timer = setInterval(() => setIdx((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  function go(i) {
    setIdx((i + count) % count);
  }

  function onTouchStart(e) {
    setPaused(true);
    touchX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    const start = touchX.current;
    touchX.current = null;
    setPaused(false);
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1);
  }

  return (
    <div
      className="hm-banner"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="hm-banner-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {banners.map((b) => (
          <div
            key={b.id}
            className="hm-banner-slide"
            style={{ cursor: b.link_product_id ? 'pointer' : 'default' }}
            onClick={() => b.link_product_id && navigate(`/menu/product/${b.link_product_id}`)}
          >
            <img src={`${API_BASE}${b.image_url}`} alt="" draggable={false} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" className="hm-banner-arrow left" aria-label="ກ່ອນໜ້າ" onClick={() => go(idx - 1)}>‹</button>
          <button type="button" className="hm-banner-arrow right" aria-label="ຖັດໄປ" onClick={() => go(idx + 1)}>›</button>
          <div className="hm-dots">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`ແບນເນີທີ ${i + 1}`}
                className={`hm-dot ${i === idx ? 'active' : ''}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}