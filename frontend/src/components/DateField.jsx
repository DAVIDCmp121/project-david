import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ช่องเลือกวันที่แบบวัน/เดือน/ปี (dd/mm/yyyy) พร้อมปฏิทินภาษาລາວ
// value / onChange ใช้รูปแบบ 'YYYY-MM-DD' เหมือน <input type="date"> เดิม
// min = วันที่ก่อนหน้านี้จะเป็นสีจางและกดไม่ได้

const MONTHS = [
  'ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ',
  'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ',
];
const WEEKDAYS = ['ອາ', 'ຈ', 'ຄ', 'ພ', 'ພຫ', 'ສຸ', 'ສ']; // ອາທິດ ຈັນ ອັງຄານ ພຸດ ພະຫັດ ສຸກ ເສົາ

const POP_W = 292;
const POP_H = 340;

const css = `
.df-pop{position:fixed;z-index:5000;width:${POP_W}px;box-sizing:border-box;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.18);padding:12px;font-family:inherit;user-select:none}
.df-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.df-title{flex:1;text-align:center;font-weight:700;font-size:.98rem}
.df-nav{width:34px;height:34px;border:none;border-radius:50%;background:#f3f4f6;color:#374151;font-size:1.1rem;line-height:1;cursor:pointer;padding:0;font-family:inherit}
.df-nav:hover{background:#e5e7eb}
.df-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
.df-wd{text-align:center;font-size:.74rem;font-weight:700;color:#6b7280;padding:6px 0}
.df-day{height:36px;border:none;border-radius:50%;background:none;font-size:.9rem;font-family:inherit;color:#1f2937;cursor:pointer;padding:0}
.df-day:not(:disabled):hover{background:#eff6ff}
.df-day.today{box-shadow:inset 0 0 0 1.5px var(--blue,#2563eb)}
.df-day.sel,.df-day.sel:hover{background:var(--blue,#2563eb);color:#fff;font-weight:700}
.df-day:disabled{opacity:.3;cursor:not-allowed}
.df-foot{display:flex;justify-content:space-between;margin-top:8px}
.df-link{border:none;background:none;color:var(--blue,#2563eb);font-weight:700;font-size:.88rem;cursor:pointer;font-family:inherit;padding:6px 8px}
.df-link:disabled{opacity:.35;cursor:not-allowed}
`;

const baseStyle = {
  width: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: 10,
  borderRadius: 6,
  border: '1px solid var(--cust-border, #E5E0D8)',
  background: 'var(--cust-input-bg, #F5F5F3)',
  color: '#2B2620',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function toKey(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`; // m เริ่มจาก 0
}

function parseKey(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function fmtDisplay(key) {
  const p = parseKey(key);
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : '';
}

export default function DateField({ value, onChange, min, placeholder = 'dd/mm/yyyy', style }) {
  const val = (value || '').slice(0, 10);
  const minKey = (min || '').slice(0, 10);
  const today = todayKey();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: 2026, m: 0 });
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  function openPicker() {
    const base = parseKey(val) || parseKey(minKey) || parseKey(today);
    setView({ y: base.y, m: base.m });

    const rect = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POP_W - 8));
    let top = rect.bottom + 4;
    if (top + POP_H > window.innerHeight && rect.top - POP_H - 4 > 0) {
      top = rect.top - POP_H - 4;
    }
    setPos({ top, left });
    setOpen(true);
  }

  // ปิดเมื่อกดที่อื่น / กด Esc / เลื่อนหน้า / ย่อขยายหน้าต่าง
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    function onDown(e) {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      close();
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    }
    function onScroll(e) {
      if (popRef.current && popRef.current.contains(e.target)) return;
      close();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function shiftMonth(delta) {
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { y, m };
    });
  }

  function pick(key) {
    onChange(key);
    setOpen(false);
  }

  const firstDay = new Date(view.y, view.m, 1).getDay(); // 0 = อาทิตย์
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const todayDisabled = !!minKey && today < minKey;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        style={{ ...baseStyle, ...style }}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span style={{ color: val ? 'inherit' : '#9ca3af' }}>{val ? fmtDisplay(val) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div ref={popRef} className="df-pop" style={{ top: pos.top, left: pos.left }}>
            <style>{css}</style>

            <div className="df-head">
              <button type="button" className="df-nav" onClick={() => shiftMonth(-1)} aria-label="prev">‹</button>
              <div className="df-title">{MONTHS[view.m]} {view.y}</div>
              <button type="button" className="df-nav" onClick={() => shiftMonth(1)} aria-label="next">›</button>
            </div>

            <div className="df-grid">
              {WEEKDAYS.map((w) => (
                <div key={w} className="df-wd">{w}</div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const key = toKey(view.y, view.m, d);
                const disabled = !!minKey && key < minKey;
                const cls = `df-day${key === val ? ' sel' : ''}${key === today ? ' today' : ''}`;
                return (
                  <button key={key} type="button" className={cls} disabled={disabled} onClick={() => pick(key)}>
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="df-foot">
              <button type="button" className="df-link" onClick={() => pick('')}>ລ້າງ</button>
              <button type="button" className="df-link" disabled={todayDisabled} onClick={() => pick(today)}>ມື້ນີ້</button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}