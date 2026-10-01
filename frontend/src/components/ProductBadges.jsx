// จดรูปแบบตัวเลข: 129500.00 -> 129,500
export function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return String(n ?? '');
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ป้ายบนรปสินค้า (มุมบนซ้าย): ขายดี + จัดโปร
export function ImageBadges({ product }) {
  if (!product.is_bestseller && !product.is_promo) return null;

  const original = Number(product.price);
  const promo = Number(product.final_price);
  const pct = original > 0 ? Math.round((1 - promo / original) * 100) : 0;

  return (
    <div
      style={{
        position: 'absolute', top: 8, left: 8, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
        pointerEvents: 'none',
      }}
    >
      {product.is_bestseller && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700,
            padding: '4px 10px 4px 8px', borderRadius: 999,
            boxShadow: '0 2px 6px rgba(220,38,38,0.35)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          ສິນຄ້າຂາຍດີ
        </span>
      )}

      {product.is_promo && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'stretch', overflow: 'hidden',
            border: '1px solid #dc2626', borderRadius: 999, fontSize: 12, fontWeight: 700,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          }}
        >
          <span style={{ background: 'rgba(255,255,255,0.95)', color: '#dc2626', padding: '3px 9px' }}>
            ຈັດໂປຣ
          </span>
          {pct > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', padding: '3px 9px' }}>
              -{pct}%
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// ราคา: ถ้ามีโปร = ราคาเดิมขีดฆ่าอยู่ซ้าย / ราคาโปรสีแดงอยู่ขวา (แถวเดียวกัน)
export function PriceBlock({ product, large = false }) {
  const rowStyle = {
    display: 'flex',
    alignItems: 'baseline',
    gap: large ? 10 : 6,
    flexWrap: large ? 'wrap' : 'nowrap',
    whiteSpace: 'nowrap',
    overflow: large ? 'visible' : 'hidden',
    minWidth: 0,
  };

  if (!product.is_promo) {
    return (
      <div style={rowStyle}>
        <span
          style={{
            color: 'var(--gold)',
            fontWeight: 700,
            fontSize: large ? '1.25rem' : '0.98rem',
          }}
        >
          {formatPrice(product.price)} ກີບ
        </span>
      </div>
    );
  }

  return (
    <div style={rowStyle}>
      <s
        style={{
          color: '#9ca3af',
          fontSize: large ? '0.95rem' : '0.74rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {formatPrice(product.price)}{large ? ' ກີບ' : ''}
      </s>
      <span
        style={{
          color: '#dc2626',
          fontWeight: 700,
          fontSize: large ? '1.35rem' : '0.98rem',
          flexShrink: 0,
        }}
      >
        {formatPrice(product.final_price)} ກີບ
      </span>
    </div>
  );
}