import { useEffect, useState } from 'react';

// ---------- ໄອຄອນສຳເລັດຮູບ ----------
const ICON_PATHS = {
  all: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  tshirt: (
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  ),
  sweater: (
    <>
      <path d="M9 3 3 6l-1 7 3 .8V21h14v-7.2l3-.8-1-7-6-3a3 3 0 0 1-6 0z" />
      <path d="M5 17.5h14" />
    </>
  ),
  hoodie: (
    <>
      <path d="M8 3 3 6l-1 5 3 1.2V21h14v-8.8l3-1.2-1-5-5-3" />
      <path d="M8 3c.5 3 2 4.5 4 4.5S15.5 6 16 3" />
      <path d="M10.5 8.5v3M13.5 8.5v3" />
      <path d="M8.5 16h7" />
    </>
  ),
  cap: (
    <>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M3 15h18" />
      <path d="M17.5 15c.9 1.9 3 2.7 4.8 2.4" />
      <path d="M12 7V5.5" />
    </>
  ),
  pants: (
    <>
      <path d="M7 2h10l1 20h-5l-1-11-1 11H6z" />
      <path d="M7 6.5h10" />
    </>
  ),
  bag: (
    <>
      <path d="M5 9h14l-1 11.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8z" />
      <path d="M9 9V7.5a3 3 0 0 1 6 0V9" />
    </>
  ),
  tag: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),
};

function CategoryIcon({ type, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[type] || ICON_PATHS.tag}
    </svg>
  );
}

// ເລືອກໄອຄອນຈາກຄຳໃນຊື່ໝວດ (ຖ້າບໍ່ເຂົ້າພວກໃດ ໃຊ້ໄອຄອນປ້າຍທົ່ວໄປ)
function pickIconType(name) {
  const n = String(name || '').toLowerCase();
  const has = (...keys) => keys.some((k) => n.includes(k));
  if (has('ຮູດ', 'hood')) return 'hoodie';
  if (has('ສະເວ', 'sweat', 'jacket', 'ເສື້ອກັນໜາວ')) return 'sweater';
  if (has('ໝວກ', 'ຫມວກ', 'cap', 'hat')) return 'cap';
  if (has('ໂສ້ງ', 'ໂສງ', 'pant', 'trouser', 'jean')) return 'pants';
  if (has('ກະເປົາ', 'ກະເປາ', 'bag')) return 'bag';
  if (has('ເສື້ອ', 'ເສືອ', 'shirt', 'tee', 'polo')) return 'tshirt';
  return 'tag';
}

// ຈຳນວນໝວດຫຼັກທີ່ສະແດງ: ຄອມ 5 / ມືຖື 4
function useVisibleCount() {
  const query = '(max-width: 600px)';
  const getCount = () =>
    typeof window !== 'undefined' && window.matchMedia(query).matches ? 4 : 5;

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setCount(mq.matches ? 4 : 5);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return count;
}

export default function CategoryBar({ products, selected, onSelect }) {
  const visibleCount = useVisibleCount();
  const [moreOpen, setMoreOpen] = useState(false);

  // ນັບສິນຄ້າຕໍ່ໝວດ ແລ້ວຮຽງຈາກຫຼາຍໄປນ້ອຍ
  const counts = {};
  (products || []).forEach((p) => {
    const c = (p.category || '').trim();
    if (c) counts[c] = (counts[c] || 0) + 1;
  });
  const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));

  if (names.length === 0) return null;

  const main = names.slice(0, visibleCount);
  const rest = names.slice(visibleCount);
  const selectedInRest = rest.includes(selected);

  function pick(name) {
    // ກົດໝວດທີ່ເລືອກຢູ່ຊ້ຳ = ກັບໄປເບິ່ງທັງໝົດ
    onSelect(name === selected ? '' : name);
    setMoreOpen(false);
  }

  return (
    <>
      <div className="cb-icons">
        <button
          type="button"
          className={`cb-item ${!selected ? 'active' : ''}`}
          onClick={() => { onSelect(''); setMoreOpen(false); }}
        >
          <span className="cb-icon"><CategoryIcon type="all" /></span>
          <span className="cb-label">ທັງໝົດ</span>
        </button>

        {main.map((name) => (
          <button
            key={name}
            type="button"
            title={name}
            className={`cb-item ${selected === name ? 'active' : ''}`}
            onClick={() => pick(name)}
          >
            <span className="cb-icon"><CategoryIcon type={pickIconType(name)} /></span>
            <span className="cb-label">{name}</span>
          </button>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="cb-more">
          <button
            type="button"
            className={`cb-more-btn ${selectedInRest ? 'active' : ''}`}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <span className="cb-more-text">{selectedInRest ? selected : 'ເພີ່ມເຕີມ'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {moreOpen && (
            <>
              <div onClick={() => setMoreOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 15 }} />
              <div className="cb-menu">
                {rest.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`cb-menu-item ${selected === name ? 'active' : ''}`}
                    onClick={() => pick(name)}
                  >
                    <CategoryIcon type={pickIconType(name)} size={18} />
                    <span>{name}</span>
                    <span className="cb-menu-count">{counts[name]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}