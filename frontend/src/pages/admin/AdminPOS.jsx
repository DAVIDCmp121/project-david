import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuthHeader } from '../../api.js';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const LOW_STOCK = 5; // ສະຕັອກເຫຼືອເທົ່ານີ້ຫຼືໜ້ອຍກວ່າ ສະແດງປ້າຍເຕືອນ

const PAY = [
  { key: 'cash', label: 'ເງິນສົດ' },
  { key: 'transfer', label: 'ໂອນ' },
];

function billTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Vientiane' });
  } catch (e) {
    return '';
  }
}

/* =========================================================
   ໝວດສິນຄ້າ: ໄອຄອນວົງມົນ + ປຸ່ມ "ເພີ່ມເຕີມ" (ແບບດຽວກັບໜ້າເມນູ)
   ========================================================= */

// ເດົາຊະນິດໄອຄອນຈາກຊື່ໝວດ (ຖ້າບໍ່ກົງ ຈະໃຊ້ໄອຄອນປ້າຍລາຄາ)
function catKind(name) {
  const n = (name || '').toLowerCase();
  if (n === 'all') return 'all';
  if (/ກະເປົາ|bag/.test(n)) return 'bag';
  if (/ໝວກ|ຫມວກ|cap|hat/.test(n)) return 'cap';
  if (/ຮູດ|ສະເວັດ|hood|sweat|jacket/.test(n)) return 'hoodie';
  if (/ໂສ້ງ|ໂສງ|pant|short|trouser|jean/.test(n)) return 'pants';
  if (/ເສື້ອ|shirt|tee|polo/.test(n)) return 'shirt';
  return 'tag';
}

const ICONS = {
  all: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
  shirt: <path d="M8.5 3.5 3 6.8l2.2 3.7L8 9v11.5h8V9l2.8 1.5L21 6.8l-5.5-3.3C15 5 13.7 6 12 6S9 5 8.5 3.5Z" />,
  bag: (
    <>
      <path d="M5.5 8h13l1 12.5h-15L5.5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  cap: (
    <>
      <path d="M4 14c0-4.4 3.4-7.5 8-7.5s8 3.1 8 7.5Z" />
      <path d="M20 14c1.6.2 2.6 1 2.6 2.2H13.5" />
    </>
  ),
  pants: <path d="M7 3.5h10l1 17h-4.7L12 10.5l-1.3 10H6l1-17Z" />,
  hoodie: (
    <>
      <path d="M8.5 4 3 7l2 4.2 3-1.2v10.5h8V10l3 1.2 2-4.2-5.5-3" />
      <path d="M8.5 4c.6 2.6 2 3.8 3.5 3.8S14.9 6.6 15.5 4" />
      <path d="M12 7.8v12.7" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.2 6.2a1.5 1.5 0 0 1-2.1 0L3.5 12.2Z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
};

function CatIcon({ kind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[kind] || ICONS.tag}
    </svg>
  );
}

function CategoryBar({ categories, total, active, onSelect }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(640);
  const [open, setOpen] = useState(false);

  // ວັດຄວາມກວ້າງ ເພື່ອຄຳນວນວ່າສະແດງໄດ້ກີ່ໝວດ
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setW(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ປິດເມນູເມື່ອກົດບ່ອນອື່ນ ຫຼື ກົດ Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const slot = 72; // ຄວາມກວ້າງຕໍ່ 1 ໝວດ (ລວມຊ່ອງວ່າງ)
  const moreW = 112; // ຄວາມກວ້າງຂອງປຸ່ມ "ເພີ່ມເຕີມ"
  const fitAll = (categories.length + 1) * slot - 6 <= w;
  const slotsWithMore = Math.max(2, Math.floor((w - moreW + 6) / slot)); // ລວມປຸ່ມ "ທັງໝົດ"
  const visibleCount = fitAll ? categories.length : Math.max(1, slotsWithMore - 1);

  let visible = categories.slice(0, visibleCount);
  // ຖ້າໝວດທີ່ເລືອກຢູ່ໃນເມນູ "ເພີ່ມເຕີມ" ໃຫ້ຍ້າຍມາສະແດງໃຫ້ເຫັນ
  if (!fitAll && active !== 'all' && !visible.some((c) => c.name === active)) {
    const act = categories.find((c) => c.name === active);
    if (act) visible = [...visible.slice(0, -1), act];
  }
  const overflow = fitAll ? [] : categories.filter((c) => !visible.some((v) => v.name === c.name));

  function pick(name) {
    onSelect(name);
    setOpen(false);
  }

  return (
    <div className="pos-catbar" ref={wrapRef}>
      <button type="button" className={`pos-cat${active === 'all' ? ' on' : ''}`} onClick={() => pick('all')} aria-pressed={active === 'all'}>
        <span className="pos-cat-ic">
          <CatIcon kind="all" />
          <span className="pos-cat-n">{total}</span>
        </span>
        <span className="pos-cat-l">ທັງໝົດ</span>
      </button>

      {visible.map((c) => (
        <button
          key={c.name}
          type="button"
          className={`pos-cat${active === c.name ? ' on' : ''}`}
          onClick={() => pick(c.name)}
          aria-pressed={active === c.name}
        >
          <span className="pos-cat-ic">
            <CatIcon kind={catKind(c.name)} />
            <span className="pos-cat-n">{c.count}</span>
          </span>
          <span className="pos-cat-l">{c.name}</span>
        </button>
      ))}

      {overflow.length > 0 && (
        <>
          <button
            type="button"
            className={`pos-more${open ? ' open' : ''}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="true"
          >
            ເພີ່ມເຕີມ
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open && (
            <div className="pos-menu" role="menu">
              {overflow.map((c) => (
                <button key={c.name} type="button" role="menuitem" className={active === c.name ? 'on' : ''} onClick={() => pick(c.name)}>
                  <span>{c.name}</span>
                  <small>{c.count}</small>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const css = `
.pos{--pos-blue:var(--blue,#2563eb);--pos-line:#e6e8ee;--pos-mut:#6b7280;--pos-ink:#111827;
  width:100%;max-width:1280px;margin:0 auto;display:flex;flex-direction:column;gap:14px;color:var(--pos-ink);
  font-variant-numeric:tabular-nums}
.pos *{box-sizing:border-box}
.pos button{font:inherit}
.pos button:focus-visible,.pos input:focus-visible{outline:2px solid var(--pos-blue);outline-offset:2px}
.pos-panel{background:#fff;border:1px solid var(--pos-line);border-radius:14px;padding:16px 18px}
.pos-sub{font-size:.8rem;color:var(--pos-mut)}

/* ສະຫຼຸບມື້ນີ້ */
.pos-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:14px 6px}
.pos-stat{padding:0 16px;display:flex;flex-direction:column;gap:2px;min-width:0}
.pos-stat+.pos-stat{border-left:1px solid var(--pos-line)}
.pos-stat dt{font-size:.78rem;color:var(--pos-mut);font-weight:600}
.pos-stat dd{margin:0;font-size:1.15rem;font-weight:800;overflow-wrap:anywhere}
.pos-stat.main dd{font-size:1.4rem;color:var(--pos-blue)}

/* ໂຄງຫຼັກ */
.pos-wrap{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(340px,1fr);gap:14px;align-items:start}
.pos-search{width:100%;margin:0;padding:11px 14px;border:1px solid #d1d5db;border-radius:10px;font:inherit;font-size:.95rem}

/* ໝວດສິນຄ້າ (ແບບໜ້າເມນູ) */
.pos-catbar{position:relative;display:flex;align-items:flex-start;gap:6px;padding-top:14px}
.pos-cat{flex:none;width:66px;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;padding:2px 0;cursor:pointer;color:#4b5563}
.pos-cat-ic{position:relative;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:1px solid #d9dde4;background:#fff;color:#4b5563;transition:background-color .15s,border-color .15s,color .15s,transform .15s}
.pos-cat:hover .pos-cat-ic{border-color:var(--pos-blue);color:var(--pos-blue)}
.pos-cat:active .pos-cat-ic{transform:scale(.95)}
.pos-cat.on .pos-cat-ic{background:var(--pos-blue);border-color:var(--pos-blue);color:#fff}
.pos-cat-n{position:absolute;top:-3px;right:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#eef0f4;color:#4b5563;font-size:.68rem;font-weight:700;display:grid;place-items:center;border:2px solid #fff}
.pos-cat.on .pos-cat-n{background:#111827;color:#fff}
.pos-cat-l{font-size:.76rem;line-height:1.25;text-align:center;max-width:66px;font-weight:600;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
.pos-cat.on .pos-cat-l{color:var(--pos-blue);font-weight:800}
.pos-more{margin:8px 0 0 auto;flex:none;display:inline-flex;align-items:center;gap:6px;border:1px solid #d9dde4;background:#fff;color:#374151;border-radius:999px;padding:8px 14px;font-size:.85rem;font-weight:600;cursor:pointer;transition:border-color .15s,background-color .15s}
.pos-more:hover,.pos-more.open{border-color:var(--pos-blue);color:var(--pos-blue)}
.pos-more svg{transition:transform .15s}
.pos-more.open svg{transform:rotate(180deg)}
.pos-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;min-width:210px;max-height:300px;overflow-y:auto;background:#fff;border:1px solid var(--pos-line);border-radius:12px;padding:6px;box-shadow:0 12px 32px rgba(16,24,40,.16)}
.pos-menu button{display:flex;justify-content:space-between;align-items:center;gap:14px;width:100%;border:0;background:none;padding:10px 12px;border-radius:8px;cursor:pointer;font-weight:600;color:#374151;text-align:left}
.pos-menu button:hover{background:#f3f6ff}
.pos-menu button.on{background:#eff6ff;color:var(--pos-blue)}
.pos-menu small{color:#9ca3af;font-weight:600}

/* ສິນຄ້າ */
.pos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px;margin-top:12px}
.pos-card{position:relative;display:flex;flex-direction:column;gap:2px;border:1px solid var(--pos-line);border-radius:12px;background:#fff;padding:8px;cursor:pointer;text-align:left;transition:border-color .15s,box-shadow .15s}
.pos-card:hover:not([disabled]){border-color:var(--pos-blue);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.pos-card[disabled]{cursor:not-allowed;background:#fafafa}
.pos-card[disabled] .pos-img{filter:grayscale(1);opacity:.45}
.pos-img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block;background:#f3f4f6}
.pos-pname{font-weight:700;font-size:.88rem;margin-top:6px;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.pos-price{font-size:.88rem;font-weight:700}
.pos-price s{color:#9ca3af;font-weight:500;margin-right:5px}
.pos-price .sale{color:#dc2626}
.pos-stock{font-size:.76rem;font-weight:600;color:var(--pos-mut)}
.pos-stock.low{color:#b45309}
.pos-stock.out{color:#dc2626}
.pos-incart{position:absolute;top:14px;right:14px;min-width:26px;height:26px;padding:0 8px;border-radius:999px;background:var(--pos-blue);color:#fff;font-size:.82rem;font-weight:800;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.pos-empty{text-align:center;color:var(--pos-mut);padding:34px 0;font-size:.92rem}
.pos-sk{border-radius:12px;height:210px;background:linear-gradient(90deg,#eef0f4 25%,#f7f8fa 37%,#eef0f4 63%);background-size:400% 100%;animation:pos-sh 1.3s ease infinite}
@keyframes pos-sh{0%{background-position:100% 50%}100%{background-position:0 50%}}

/* ບິນ */
.pos-cart{position:sticky;top:12px;display:flex;flex-direction:column}
.pos-cart-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.pos-cart-h h3{margin:0;font-size:1.05rem}
.pos-link{border:0;background:none;color:#dc2626;font-size:.84rem;font-weight:600;cursor:pointer;padding:4px 2px}
.pos-lines{max-height:300px;overflow-y:auto;margin:0 -4px;padding:0 4px}
.pos-line{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #f1f3f6}
.pos-line:first-child{border-top:0}
.pos-thumb{width:44px;height:44px;border-radius:8px;object-fit:cover;background:#f3f4f6;display:block}
.pos-lname{font-weight:700;font-size:.88rem;line-height:1.25}
.pos-lname span{color:var(--pos-mut);font-weight:500}
.pos-step{display:flex;align-items:center;gap:4px}
.pos-step button{width:30px;height:30px;border:1px solid #d1d5db;background:#fff;border-radius:8px;cursor:pointer;font-size:1rem;line-height:1;color:#374151}
.pos-step button:hover:not(:disabled){border-color:#9ca3af;background:#f9fafb}
.pos-step button:disabled{opacity:.4;cursor:not-allowed}
.pos-step button.del{color:#dc2626;margin-left:4px}
.pos-step b{min-width:22px;text-align:center}
.pos-hint{color:var(--pos-mut);font-size:.9rem;padding:18px 4px;text-align:center;border:1px dashed #d1d5db;border-radius:10px}

.pos-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 12px}
.pos-lbl{font-size:.78rem;color:var(--pos-mut);font-weight:600;margin-bottom:3px;display:block}
.pos .pos-in{width:100%;margin:0;padding:9px 11px;border:1px solid #d1d5db;border-radius:8px;font:inherit;font-size:.93rem;background:#fff}
.pos-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#f1f3f6;border-radius:10px;margin-bottom:12px}
.pos-seg button{border:0;background:transparent;padding:10px 8px;border-radius:8px;font-weight:700;color:#4b5563;cursor:pointer;transition:background-color .15s,color .15s}
.pos-seg button.on{background:var(--pos-blue);color:#fff}
.pos-quick{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.pos-quick button{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:6px 11px;font-size:.85rem;font-weight:600;color:#374151;cursor:pointer}
.pos-quick button:hover{border-color:var(--pos-blue);color:var(--pos-blue)}
.pos-change{display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;padding:10px 14px;border-radius:10px}
.pos-change span{font-weight:700}
.pos-change b{font-size:1.5rem}
.pos-change.ok{background:#dcfce7;color:#15803d}
.pos-change.bad{background:#fee2e2;color:#b91c1c}

.pos-sum{border-top:2px solid #eceff4;margin-top:14px;padding-top:10px}
.pos-sumrow{display:flex;justify-content:space-between;font-size:.88rem;color:var(--pos-mut);padding:2px 0}
.pos-sumrow.disc{color:#dc2626}
.pos-total{display:flex;justify-content:space-between;align-items:baseline;margin:6px 0 12px}
.pos-total span{font-weight:700}
.pos-total b{font-size:1.7rem;letter-spacing:-.01em}
.pos-err{color:#b91c1c;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 10px;font-size:.85rem;margin-bottom:10px}
.pos-go{width:100%;border:0;background:var(--pos-blue);color:#fff;border-radius:10px;padding:14px;font-weight:800;font-size:1.02rem;cursor:pointer;transition:filter .15s}
.pos-go:hover:not(:disabled){filter:brightness(.93)}
.pos-go:disabled{opacity:.5;cursor:not-allowed}

.pos-recent{margin-top:16px;padding-top:12px;border-top:1px dashed var(--pos-line)}
.pos-recent h4{margin:0 0 6px;font-size:.84rem;color:var(--pos-mut);font-weight:700}
.pos-rrow{display:flex;justify-content:space-between;gap:10px;font-size:.84rem;padding:4px 0;color:#374151}
.pos-rrow span:first-child{color:var(--pos-mut)}

/* ປຸ່ມລອຍສຳລັບໜ້າຈໍນ້ອຍ */
.pos-fab{display:none}

/* popup */
.pos-sizes{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px}
.pos-size{padding:10px 8px;border-radius:10px;border:1px solid #d1d5db;background:#fff;color:#1f2937;cursor:pointer;text-align:center}
.pos-size:hover:not(:disabled){border-color:var(--pos-blue)}
.pos-size:disabled{background:#f3f4f6;color:#9ca3af;cursor:not-allowed;text-decoration:line-through}
.pos-size b{display:block}
.pos-size small{font-size:.75rem;color:#6b7280}
.pos-rc-row{display:flex;justify-content:space-between;gap:10px;font-size:.9rem;padding:3px 0}

@media (max-width:980px){
  .pos-wrap{grid-template-columns:1fr}
  .pos-cart{position:static}
  .pos-stats{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:12px}
  .pos-stat:nth-child(3){border-left:0}
  .pos-fab{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:40;justify-content:space-between;align-items:center;gap:10px;border:0;background:var(--pos-blue);color:#fff;border-radius:14px;padding:14px 18px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer}
  .pos{padding-bottom:70px}
}
@media (max-width:560px){
  .pos-panel{padding:14px}
  .pos-grid{grid-template-columns:repeat(auto-fill,minmax(125px,1fr))}
  .pos-fields{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .pos *{transition:none!important;animation:none!important}
}
`;

export default function AdminPOS() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState([]); // { variant_id, product_id, name, size, price, quantity, max, image }
  const [pickProduct, setPickProduct] = useState(null);
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('cash');
  const [received, setReceived] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [today, setToday] = useState(null);
  const cartRef = useRef(null);

  const authInit = { credentials: 'include', headers: { ...getAuthHeader() } };

  async function loadProducts() {
    try {
      const res = await fetch('/api/pos/products', authInit);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (e) {
      setError('ໂຫຼດລາຍການສິນຄ້າບໍ່ສຳເລັດ');
    }
    setLoadingProducts(false);
  }
  async function loadToday() {
    try {
      const res = await fetch('/api/pos/today', authInit);
      const data = await res.json();
      if (res.ok) setToday(data);
    } catch (e) {
      // ບໍ່ເປັນຫຍັງ
    }
  }

  useEffect(() => {
    loadProducts();
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ໝວດສິນຄ້າ (ດຶງຈາກຂໍ້ມູນສິນຄ້າ)
  const categories = useMemo(() => {
    const m = {};
    products.forEach((p) => {
      const c = (p.category || '').trim();
      if (c) m[c] = (m[c] || 0) + 1;
    });
    return Object.entries(m).map(([name, count]) => ({ name, count }));
  }, [products]);

  // ຖ້າໝວດທີ່ເລືອກຢູ່ບໍ່ມີແລ້ວ ໃຫ້ກັບໄປ "ທັງໝົດ"
  useEffect(() => {
    if (category !== 'all' && categories.length > 0 && !categories.some((c) => c.name === category)) {
      setCategory('all');
    }
  }, [categories, category]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'all' && (p.category || '').trim() !== category) return false;
      if (!t) return true;
      return (
        (p.name || '').toLowerCase().includes(t) ||
        (p.category || '').toLowerCase().includes(t) ||
        (p.color || '').toLowerCase().includes(t)
      );
    });
  }, [products, q, category]);

  // ຈຳນວນໃນບິນ ແຍກຕາມສິນຄ້າ (ໄວ້ສະແດງປ້າຍເທິງການ໌ດ)
  const inCartByProduct = useMemo(() => {
    const m = {};
    cart.forEach((c) => {
      m[c.product_id] = (m[c.product_id] || 0) + c.quantity;
    });
    return m;
  }, [cart]);

  function inCart(variantId) {
    const it = cart.find((c) => c.variant_id === variantId);
    return it ? it.quantity : 0;
  }

  function addVariant(p, v) {
    setError('');
    const have = inCart(v.id);
    if (have >= v.stock_qty) {
      setError(`"${p.name}"${v.size ? ` ໄຊສ໌ ${v.size}` : ''} ມີສະຕັອກພຽງ ${v.stock_qty} ອັນ`);
      return;
    }
    setCart((prev) => {
      const found = prev.find((c) => c.variant_id === v.id);
      if (found) {
        return prev.map((c) => (c.variant_id === v.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          variant_id: v.id,
          product_id: p.id,
          name: p.name,
          size: v.size,
          price: p.price,
          quantity: 1,
          max: v.stock_qty,
          image: p.image,
        },
      ];
    });
  }

  function handlePick(p) {
    const vs = p.variants;
    if (vs.length === 0) {
      setError('ສິນຄ້ານີ້ຍັງບໍ່ມີຂໍ້ມູນສະຕັອກ');
      return;
    }
    // ມີໄຊສ໌ດຽວ → ເພີ່ມເລີຍ; ຫຼາຍໄຊສ໌ → ໃຫ້ເລືອກ
    if (vs.length === 1) addVariant(p, vs[0]);
    else setPickProduct(p);
  }

  function changeQty(variantId, delta) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.variant_id !== variantId) return c;
          return { ...c, quantity: Math.min(c.max, c.quantity + delta) };
        })
        .filter((c) => c.quantity > 0)
    );
  }
  function removeLine(variantId) {
    setCart((prev) => prev.filter((c) => c.variant_id !== variantId));
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const pieces = cart.reduce((s, c) => s + c.quantity, 0);
  const discountNum = Math.min(subtotal, Math.max(0, parseInt(discount, 10) || 0));
  const total = subtotal - discountNum;
  const receivedNum = parseInt(received, 10) || 0;
  const change = receivedNum - total;
  const shortCash = payment === 'cash' && received !== '' && change < 0;

  // ປຸ່ມລັດຈຳນວນເງິນທີ່ຮັບມາ
  const quick = useMemo(() => {
    if (total <= 0) return [];
    const up = (u) => Math.ceil(total / u) * u;
    const set = new Set([total, up(10000), up(50000), up(100000), up(100000) + 100000, up(500000)]);
    return [...set].sort((a, b) => a - b).slice(0, 4);
  }, [total]);

  function resetBill() {
    setCart([]);
    setDiscount('');
    setReceived('');
    setPhone('');
    setPayment('cash');
    setError('');
  }

  async function confirmSale() {
    setError('');
    if (cart.length === 0) {
      setError('ຍັງບໍ່ມີສິນຄ້າໃນບິນ');
      return;
    }
    if (shortCash) {
      setError('ເງິນທີ່ຮັບມາໜ້ອຍກວ່າຍອດທີ່ຕ້ອງຈ່າຍ');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          items: cart.map((c) => ({ variant_id: c.variant_id, quantity: c.quantity })),
          payment_method: payment,
          discount: discountNum,
          customer_phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'ບັນທຶກການຂາຍບໍ່ສຳເລັດ');
        // ສະຕັອກອາດປ່ຽນ ໂຫຼດໃໝ່ເພື່ອໃຫ້ຕົວເລກຖືກຕ້ອງ
        loadProducts();
      } else {
        setReceipt({
          ...data,
          received: payment === 'cash' && received !== '' ? receivedNum : null,
        });
        resetBill();
        loadProducts();
        loadToday();
      }
    } catch (e) {
      setError('ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້');
    }
    setSaving(false);
  }

  return (
    <div className="pos">
      <style>{css}</style>

      {/* ---------- ສະຫຼຸບຍອດຂາຍໜ້າຮ້ານມື້ນີ້ ---------- */}
      {today && (
        <dl className="pos-panel pos-stats" style={{ margin: 0 }}>
          <div className="pos-stat main">
            <dt>ຍອດຂາຍໜ້າຮ້ານມື້ນີ້</dt>
            <dd>{fmt(today.total)} <span className="pos-sub">ກີບ</span></dd>
          </div>
          <div className="pos-stat">
            <dt>ເງິນສົດ</dt>
            <dd>{fmt(today.cash)}</dd>
          </div>
          <div className="pos-stat">
            <dt>ໂອນ</dt>
            <dd>{fmt(today.transfer)}</dd>
          </div>
          <div className="pos-stat">
            <dt>ຈຳນວນບິນ</dt>
            <dd>{fmt(today.count)} <span className="pos-sub">ບິນ • {fmt(today.pieces)} ຊິ້ນ</span></dd>
          </div>
        </dl>
      )}

      <div className="pos-wrap">
        {/* ---------- ຊ້າຍ: ເລືອກສິນຄ້າ ---------- */}
        <div className="pos-panel">
          <input
            className="pos-search"
            placeholder="🔍 ຄົ້ນຫາສິນຄ້າ (ຊື່ / ໝວດ / ສີ)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length === 1) {
                const p = filtered[0];
                if (p.variants.reduce((s, v) => s + v.stock_qty, 0) > 0) handlePick(p);
              }
            }}
          />

          {categories.length > 0 && (
            <CategoryBar categories={categories} total={products.length} active={category} onSelect={setCategory} />
          )}

          {loadingProducts ? (
            <div className="pos-grid">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="pos-sk" />)}
            </div>
          ) : (
            <div className="pos-grid">
              {filtered.map((p) => {
                const totalStock = p.variants.reduce((s, v) => s + v.stock_qty, 0);
                const out = totalStock <= 0;
                const low = !out && totalStock <= LOW_STOCK;
                const onSale = p.price < p.original_price;
                const n = inCartByProduct[p.id] || 0;
                return (
                  <button key={p.id} type="button" className="pos-card" disabled={out} onClick={() => handlePick(p)}>
                    {n > 0 && <span className="pos-incart">{n}</span>}
                    {p.image ? (
                      <img className="pos-img" src={p.image} alt="" loading="lazy" />
                    ) : (
                      <div className="pos-img" />
                    )}
                    <div className="pos-pname">{p.name}</div>
                    <div className="pos-price">
                      {onSale && <s>{fmt(p.original_price)}</s>}
                      <span className={onSale ? 'sale' : ''}>{fmt(p.price)}</span>
                    </div>
                    <div className={`pos-stock${out ? ' out' : low ? ' low' : ''}`}>
                      {out ? 'ໝົດ' : low ? `ໃກ້ໝົດ • ເຫຼືອ ${totalStock}` : `ເຫຼືອ ${totalStock}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!loadingProducts && filtered.length === 0 && <div className="pos-empty">ບໍ່ພົບສິນຄ້າ</div>}
        </div>

        {/* ---------- ຂວາ: ບິນ ---------- */}
        <div className="pos-panel pos-cart" ref={cartRef}>
          <div className="pos-cart-h">
            <h3>
              ບິນຂາຍ{' '}
              {pieces > 0 && <span className="pos-sub" style={{ fontWeight: 500 }}>• {pieces} ຊິ້ນ</span>}
            </h3>
            {cart.length > 0 && (
              <button type="button" className="pos-link" onClick={resetBill}>ລ້າງບິນ</button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="pos-hint">ກົດເລືອກສິນຄ້າທາງຊ້າຍເພື່ອເພີ່ມເຂົ້າບິນ</div>
          ) : (
            <div className="pos-lines">
              {cart.map((c) => (
                <div key={c.variant_id} className="pos-line">
                  {c.image ? <img className="pos-thumb" src={c.image} alt="" /> : <div className="pos-thumb" />}
                  <div style={{ minWidth: 0 }}>
                    <div className="pos-lname">
                      {c.name} {c.size && <span>({c.size})</span>}
                    </div>
                    <div className="pos-sub">{fmt(c.price)} × {c.quantity} = <b style={{ color: '#111827' }}>{fmt(c.price * c.quantity)}</b></div>
                  </div>
                  <div className="pos-step">
                    <button type="button" aria-label="ລົດ" onClick={() => changeQty(c.variant_id, -1)}>−</button>
                    <b>{c.quantity}</b>
                    <button type="button" aria-label="ເພີ່ມ" disabled={c.quantity >= c.max} onClick={() => changeQty(c.variant_id, 1)}>+</button>
                    <button type="button" className="del" aria-label="ລຶບ" onClick={() => removeLine(c.variant_id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pos-fields">
            <div>
              <label className="pos-lbl">ສ່ວນລົດ (ກີບ)</label>
              <input className="pos-in" type="number" min="0" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className="pos-lbl">ເບີລູກຄ້າ (ບໍ່ບັງຄັບ)</label>
              <input className="pos-in" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ຖ້າເປັນສະມາຊິກ" />
            </div>
          </div>

          <div className="pos-seg" role="group" aria-label="ວິທີຈ່າຍເງິນ">
            {PAY.map((p) => (
              <button key={p.key} type="button" aria-pressed={payment === p.key} className={payment === p.key ? 'on' : ''} onClick={() => setPayment(p.key)}>
                {p.label}
              </button>
            ))}
          </div>

          {payment === 'cash' && (
            <div>
              <label className="pos-lbl">ເງິນທີ່ຮັບມາ (ກີບ)</label>
              <input className="pos-in" type="number" min="0" inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value)} />
              {quick.length > 0 && (
                <div className="pos-quick">
                  {quick.map((v) => (
                    <button key={v} type="button" onClick={() => setReceived(String(v))}>
                      {v === total ? 'ພໍດີ' : fmt(v)}
                    </button>
                  ))}
                </div>
              )}
              {received !== '' && (
                <div className={`pos-change ${change >= 0 ? 'ok' : 'bad'}`}>
                  <span>{change >= 0 ? 'ເງິນທອນ' : 'ຍັງຂາດ'}</span>
                  <b>{fmt(Math.abs(change))}</b>
                </div>
              )}
            </div>
          )}

          <div className="pos-sum">
            <div className="pos-sumrow"><span>ລວມສິນຄ້າ</span><span>{fmt(subtotal)}</span></div>
            {discountNum > 0 && (
              <div className="pos-sumrow disc"><span>ສ່ວນລົດ</span><span>−{fmt(discountNum)}</span></div>
            )}
            <div className="pos-total">
              <span>ຍອດຕ້ອງຈ່າຍ</span>
              <b>{fmt(total)} <span className="pos-sub" style={{ fontWeight: 600 }}>ກີບ</span></b>
            </div>
          </div>

          {error && <div className="pos-err" role="alert">{error}</div>}

          <button type="button" className="pos-go" disabled={saving || cart.length === 0 || shortCash} onClick={confirmSale}>
            {saving ? 'ກຳລັງບັນທຶກ...' : cart.length === 0 ? 'ຢືນຢັນການຂາຍ' : `ຢືນຢັນການຂາຍ • ${fmt(total)} ກີບ`}
          </button>

          {/* ບິນລ່າສຸດຂອງມື້ນີ້ */}
          {today && today.bills.length > 0 && (
            <div className="pos-recent">
              <h4>ບິນລ່າສຸດ (ຍົກເລີກບິນໄດ້ທີ່ໜ້າອໍເດີ)</h4>
              {today.bills.map((b) => (
                <div key={b.id} className="pos-rrow">
                  <span>
                    #{b.id} {billTime(b.created_at) && `• ${billTime(b.created_at)} `}• {b.qty} ຊິ້ນ • {b.payment_method === 'transfer' ? 'ໂອນ' : 'ເງິນສົດ'}
                  </span>
                  <b>{fmt(b.total)}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ປຸ່ມລອຍ (ໜ້າຈໍນ້ອຍ) ເພື່ອເລື່ອນໄປທີ່ບິນ */}
      {cart.length > 0 && (
        <button type="button" className="pos-fab" onClick={() => cartRef.current && cartRef.current.scrollIntoView({ behavior: 'smooth' })}>
          <span>ເບິ່ງບິນ • {pieces} ຊິ້ນ</span>
          <span>{fmt(total)} ກີບ</span>
        </button>
      )}

      {/* ---------- popup ເລືອກໄຊສ໌ ---------- */}
      {pickProduct && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPickProduct(null); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 380 }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setPickProduct(null)}>✕</button>
            <h3 style={{ marginTop: 0 }}>{pickProduct.name}</h3>
            <div style={{ color: '#6b7280', fontSize: '0.88rem', marginBottom: 10 }}>ເລືອກໄຊສ໌</div>
            <div className="pos-sizes">
              {pickProduct.variants.map((v) => {
                const left = v.stock_qty - inCart(v.id);
                const out = left <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="pos-size"
                    disabled={out}
                    onClick={() => { addVariant(pickProduct, v); setPickProduct(null); }}
                  >
                    <b>{v.size || '-'}</b>
                    <small>{out ? 'ໝົດ' : `ເຫຼືອ ${left}`}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------- ໃບສະຫຼຸບຫຼັງຂາຍສຳເລັດ ---------- */}
      {receipt && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, textAlign: 'center', color: '#047857' }}>✅ ຂາຍສຳເລັດ (ບິນ #{receipt.id})</h3>
            {receipt.lines.map((l) => (
              <div key={l.variant_id} className="pos-rc-row">
                <span>{l.name}{l.size ? ` (${l.size})` : ''} × {l.quantity}</span>
                <span>{fmt(l.price * l.quantity)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 8, paddingTop: 8 }}>
              {receipt.discount > 0 && (
                <div className="pos-rc-row" style={{ color: '#dc2626' }}>
                  <span>ສ່ວນລົດ</span><span>−{fmt(receipt.discount)}</span>
                </div>
              )}
              <div className="pos-rc-row" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                <span>ຍອດລວມ</span><span>{fmt(receipt.total)} ກີບ</span>
              </div>
              {receipt.received !== null && (
                <>
                  <div className="pos-rc-row">
                    <span>ຮັບເງິນ</span><span>{fmt(receipt.received)}</span>
                  </div>
                  <div className="pos-change ok">
                    <span>ເງິນທອນ</span>
                    <b>{fmt(receipt.received - receipt.total)}</b>
                  </div>
                </>
              )}
            </div>
            <button type="button" className="pos-go" style={{ marginTop: 14 }} onClick={() => setReceipt(null)}>ຂາຍບິນຕໍ່ໄປ</button>
          </div>
        </div>
      )}
    </div>
  );
}