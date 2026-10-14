import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost } from '../../api.js';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-coupons.js';

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

function CouponsInner() {
  const navigate = useNavigate();
  const { t } = usePageT(dict);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [redeemTarget, setRedeemTarget] = useState(null); // คูปองที่รอยืนยันการแลก
  const [notice, setNotice] = useState(''); // ข้อความแจ้งแทน alert()

  const kip = t('common.kip');

  function describe(c) {
    const main =
      c.type === 'percent'
        ? `${t('cp.percentOff', { v: c.value })}${
            c.max_discount ? ` (${t('cp.max', { n: fmt(c.max_discount), kip })})` : ''
          }`
        : t('cp.flatOff', { n: fmt(c.value), kip });
    const cond = c.min_order > 0 ? t('cp.minOrder', { n: fmt(c.min_order), kip }) : t('cp.noMin');
    return `${main} · ${cond}`;
  }

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

  // กดปุ่มแลก → เปิดกล่องยืนยัน
  function askRedeem(c) {
    setRedeemTarget(c);
  }

  async function doRedeem() {
    const c = redeemTarget;
    setRedeemTarget(null);
    if (!c) return;
    setBusyId(c.id);
    const r = await apiPost('/api/coupons/redeem', { coupon_id: c.id });
    setBusyId(null);
    if (r.ok) {
      setNotice(t('cp.redeemOk'));
      load();
    } else {
      setNotice((r.data && r.data.error) || t('cp.redeemFail'));
    }
  }

  const shell = (children) => (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />
      <div className="cp-page">{children}</div>

      <ConfirmModal
        open={!!redeemTarget}
        message={
          redeemTarget
            ? t('cp.redeemConfirm', { name: redeemTarget.name, n: fmt(redeemTarget.points_cost) })
            : ''
        }
        onConfirm={doRedeem}
        onCancel={() => setRedeemTarget(null)}
      />

      <ConfirmModal
        open={!!notice}
        message={notice}
        hideCancel
        onConfirm={() => setNotice('')}
        onCancel={() => setNotice('')}
      />
    </div>
  );

  if (error) {
    return shell(
      <>
        <p className="cp-empty">{t('cp.loadFail')}</p>
        <button className="cp-btn" onClick={load}>{t('common.retry')}</button>
      </>
    );
  }
  if (!data) {
    return shell(<p className="cp-empty">{t('common.loading')}</p>);
  }

  return shell(
    <>
      <button className="cp-back" onClick={() => navigate('/menu/profile')}>← {t('common.back')}</button>
      <h2 className="cp-title">{t('cp.title')}</h2>

      <div className="cp-hero">
        <div className="cp-hero-label">{t('cp.myPoints')}</div>
        <div className="cp-hero-points">{fmt(data.points)}</div>
        <div className="cp-hero-note">
          {t('cp.earnNote', { unit: fmt(data.point_unit), kip })}
        </div>
      </div>

      <div className="cp-sec">{t('cp.secRedeem')}</div>
      {data.catalog.length === 0 && <div className="cp-empty">{t('cp.noCatalog')}</div>}
      {data.catalog.map((c) => (
        <div className="cp-card" key={c.id}>
          <div className="cp-info">
            <div className="cp-name">{c.name}</div>
            <div className="cp-sub">{describe(c)}</div>
            <div className="cp-sub">{t('cp.validDays', { n: c.valid_days })}</div>
          </div>
          <button
            className="cp-btn"
            disabled={data.points < c.points_cost || busyId === c.id}
            onClick={() => askRedeem(c)}
          >
            {data.points < c.points_cost
              ? t('cp.need', { n: fmt(c.points_cost) })
              : t('cp.redeem', { n: fmt(c.points_cost) })}
          </button>
        </div>
      ))}

      <div className="cp-sec">{t('cp.secMine')}</div>
      {data.coupons.length === 0 && <div className="cp-empty">{t('cp.noMine')}</div>}
      {data.coupons.map((c) => (
        <div className="cp-card cp-mine" key={c.id}>
          <div className="cp-info">
            <div className="cp-name">{c.name}</div>
            <div className="cp-sub">{describe(c)}</div>
            <div className="cp-sub">{t('cp.expires')} {fmtDate(c.expires_at)}</div>
          </div>
        </div>
      ))}

      <div className="cp-sec">{t('cp.secHistory')}</div>
      {history.length === 0 && <div className="cp-empty">{t('cp.noHistory')}</div>}
      {history.map((h) => (
        <div className="cp-hist" key={h.id}>
          <div>
            <div className="cp-hist-note">{h.note || (h.type === 'earn' ? t('cp.earned') : t('cp.used'))}</div>
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