import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost } from '../../api.js';

const css = `
.cp-page { max-width: 640px; margin: 0 auto; padding: 16px 16px 60px; }
.cp-back {
  border: none; background: none; padding: 4px 0; margin-bottom: 8px; cursor: pointer;
  color: var(--cust-text-muted); font-family: inherit; font-size: 0.9rem;
}
.cp-title { margin: 0 0 14px; font-size: 1.5rem; color: var(--cust-text); }

.cp-hero {
  background: linear-gradient(135deg, #c9a227, #e2c35a); color: #fff; border-radius: 18px;
  padding: 20px; box-shadow: 0 8px 22px rgba(201, 162, 39, 0.3);
}
.cp-hero-label { font-size: 0.85rem; opacity: 0.92; }
.cp-hero-points { font-size: 2.5rem; font-weight: 800; line-height: 1.15; }
.cp-hero-note { font-size: 0.78rem; opacity: 0.95; margin-top: 6px; }

.cp-sec { font-size: 1rem; font-weight: 700; margin: 24px 0 10px; color: var(--cust-text); }
.cp-empty { font-size: 0.88rem; color: var(--cust-text-muted); padding: 6px 0; }

.cp-card {
  display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid var(--cust-border);
  border-radius: 14px; padding: 12px 14px; margin-bottom: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.cp-info { flex: 1; min-width: 0; }
.cp-name { font-weight: 700; color: var(--cust-text); font-size: 0.95rem; }
.cp-sub { font-size: 0.78rem; color: var(--cust-text-muted); margin-top: 2px; line-height: 1.4; }
.cp-btn {
  flex: 0 0 auto; padding: 9px 14px; border-radius: 999px; border: none; background: var(--gold);
  color: #fff; font-weight: 800; font-size: 0.82rem; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.cp-btn:disabled { background: #d8d8d4; cursor: not-allowed; }
.cp-mine { border-style: dashed; border-color: #d8c68a; background: #fffdf6; }
.cp-mine .cp-name { color: #b8862b; }

.cp-hist {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 2px; border-bottom: 1px solid var(--cust-border);
}
.cp-hist:last-child { border-bottom: none; }
.cp-hist-note { font-size: 0.88rem; color: var(--cust-text); }
.cp-hist-date { font-size: 0.75rem; color: var(--cust-text-muted); margin-top: 2px; }
.cp-pts { font-weight: 800; white-space: nowrap; }
.cp-pts.plus { color: #15803d; }
.cp-pts.minus { color: #dc2626; }
`;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function fmtDate(s) {
  return new Date(s).toLocaleDateString('en-GB');
}

function describe(c) {
  const main =
    c.type === 'percent'
      ? `ຫຼຸດ ${c.value}%${c.max_discount ? ` (ສູງສຸດ ${fmt(c.max_discount)} ກີບ)` : ''}`
      : `ຫຼຸດ ${fmt(c.value)} ກີບ`;
  const cond = c.min_order > 0 ? `ຂັ້ນຕ່ຳ ${fmt(c.min_order)} ກີບ` : 'ບໍ່ມີຂັ້ນຕ່ຳ';
  return `${main} · ${cond}`;
}

function CouponsInner() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [meRes, hRes] = await Promise.all([
      apiGet('/api/coupons/me'),
      apiGet('/api/coupons/history'),
    ]);
    if (meRes.ok) {
      setData(meRes.data);
      setError(false);
    } else {
      setError(true);
    }
    if (hRes.ok && Array.isArray(hRes.data.history)) setHistory(hRes.data.history);
  }

  useEffect(() => {
    load();
  }, []);

  async function redeem(c) {
    if (!window.confirm(`ແລກ "${c.name}" ໂດຍໃຊ້ ${fmt(c.points_cost)} ແຕ້ມ?`)) return;
    setBusyId(c.id);
    const r = await apiPost('/api/coupons/redeem', { coupon_id: c.id });
    setBusyId(null);
    if (r.ok) {
      alert('ແລກຄູປອງສຳເລັດ ໃຊ້ໄດ້ຕອນຊຳລະເງິນ');
      load();
    } else {
      alert((r.data && r.data.error) || 'ແລກຄູປອງບໍ່ສຳເລັດ');
    }
  }

  const shell = (children) => (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />
      <div className="cp-page">{children}</div>
    </div>
  );

  if (error) {
    return shell(
      <>
        <p className="cp-empty">ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່ ຫຼື ເຂົ້າສູ່ລະບົບກ່ອນ</p>
        <button className="cp-btn" onClick={load}>ລອງໃໝ່</button>
      </>
    );
  }
  if (!data) {
    return shell(<p className="cp-empty">ກຳລັງໂຫລດ...</p>);
  }

  return shell(
    <>
      <button className="cp-back" onClick={() => navigate('/menu/profile')}>← ກັບຄືນ</button>
      <h2 className="cp-title">ຄູປອງ ແລະ ແຕ້ມສະສົມ</h2>

      <div className="cp-hero">
        <div className="cp-hero-label">ແຕ້ມຂອງຂ້ອຍ</div>
        <div className="cp-hero-points">{fmt(data.points)}</div>
        <div className="cp-hero-note">
          ຮັບ 1 ແຕ້ມທຸກໆ {fmt(data.point_unit)} ກີບ ເມື່ອອໍເດີຮອດແລ້ວ
        </div>
      </div>

      <div className="cp-sec">ແລກແຕ້ມເປັນຄູປອງ</div>
      {data.catalog.length === 0 && <div className="cp-empty">ຍັງບໍ່ມີຄູປອງໃຫ້ແລກ</div>}
      {data.catalog.map((c) => (
        <div className="cp-card" key={c.id}>
          <div className="cp-info">
            <div className="cp-name">{c.name}</div>
            <div className="cp-sub">{describe(c)}</div>
            <div className="cp-sub">ໃຊ້ໄດ້ {c.valid_days} ວັນ ຫຼັງແລກ</div>
          </div>
          <button
            className="cp-btn"
            disabled={data.points < c.points_cost || busyId === c.id}
            onClick={() => redeem(c)}
          >
            {data.points < c.points_cost ? `ຕ້ອງການ ${fmt(c.points_cost)} ແຕ້ມ` : `ແລກ ${fmt(c.points_cost)} ແຕ້ມ`}
          </button>
        </div>
      ))}

      <div className="cp-sec">ຄູປອງຂອງຂ້ອຍ</div>
      {data.coupons.length === 0 && <div className="cp-empty">ທ່ານຍັງບໍ່ມີຄູປອງ</div>}
      {data.coupons.map((c) => (
        <div className="cp-card cp-mine" key={c.id}>
          <div className="cp-info">
            <div className="cp-name">{c.name}</div>
            <div className="cp-sub">{describe(c)}</div>
            <div className="cp-sub">ໝົດອາຍຸ {fmtDate(c.expires_at)}</div>
          </div>
        </div>
      ))}

      <div className="cp-sec">ປະຫວັດແຕ້ມ</div>
      {history.length === 0 && <div className="cp-empty">ຍັງບໍ່ມີປະຫວັດ</div>}
      {history.map((h) => (
        <div className="cp-hist" key={h.id}>
          <div>
            <div className="cp-hist-note">{h.note || (h.type === 'earn' ? 'ໄດ້ຮັບແຕ້ມ' : 'ໃຊ້ແຕ້ມ')}</div>
            <div className="cp-hist-date">{fmtDate(h.created_at)}</div>
          </div>
          <div className={`cp-pts ${h.points >= 0 ? 'plus' : 'minus'}`}>
            {h.points >= 0 ? '+' : ''}{fmt(h.points)}
          </div>
        </div>
      ))}
    </>
  );
}

export default function Coupons() {
  return (
    <CartProvider>
      <CouponsInner />
    </CartProvider>
  );
}