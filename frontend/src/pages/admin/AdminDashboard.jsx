import { useEffect, useMemo, useRef, useState } from 'react';
import { getAuthHeader } from '../../api.js';

/* =========================================================
   ຕົວຊ່ວຍ (format / ວັນທີ)
   ========================================================= */
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const fmtShort = (n) => {
  const v = Number(n || 0);
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return Math.round(v / 1e3) + 'K';
  return String(Math.round(v));
};
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const ratio = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

const ONLINE_COLOR = '#3b82f6';
const STORE_COLOR = '#f59e0b';

const PAY_LABEL = { cash: 'ເງິນສົດ', transfer: 'ໂອນ', cod: 'COD (ເກັບເງິນປາຍທາງ)' };
const PAY_COLOR = { cash: '#10b981', transfer: '#6366f1', cod: '#f43f5e' };
const CHANNEL_LABEL = { online: 'ອອນລາຍ', store: 'ໜ້າຮ້ານ' };

// ວັນທີປັດຈຸບັນຕາມເວລາລາວ (UTC+7)
function laoToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1;
}
function shortDate(s) {
  const [, m, d] = s.split('-');
  return `${d}/${m}`;
}
function fmtDate(s) {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

const PRESETS = [
  { key: 'today', label: 'ມື້ນີ້' },
  { key: '7', label: '7 ວັນ' },
  { key: '30', label: '30 ວັນ' },
  { key: 'month', label: 'ເດືອນນີ້' },
  { key: 'custom', label: 'ກຳນົດເອງ' },
];

function rangeFor(key, customFrom, customTo) {
  const today = laoToday();
  if (key === 'today') return { from: today, to: today };
  if (key === '7') return { from: addDays(today, -6), to: today };
  if (key === '30') return { from: addDays(today, -29), to: today };
  if (key === 'month') return { from: today.slice(0, 8) + '01', to: today };
  let from = customFrom || today;
  let to = customTo || today;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

// ຄ່າສູງສຸດຂອງແກນ Y ແບບກົມໆ ແບ່ງໄດ້ 4 ຊ່ອງ
function niceMax(v) {
  if (!v || v <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 8 ? 8 : 10;
  return nice * exp;
}

async function fetchSummary(from, to) {
  let res;
  try {
    res = await fetch(`/api/reports/summary?from=${from}&to=${to}`, {
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
  } catch (e) {
    throw new Error('ເຊື່ອມຕໍ່ເຊີບເວີບໍ່ໄດ້');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'ດຶງລາຍງານບໍ່ສຳເລັດ');
  return json;
}

/* =========================================================
   ອົງປະກອບຍ່ອຍ
   ========================================================= */

// ປ້າຍປຽບທຽບກັບຊ່ວງກ່ອນ
function Delta({ cur, prev, label }) {
  if (prev == null) return null;
  const tail = label ? <i>{label}</i> : null;
  if (!prev && !cur) return <span className="rp-delta flat">–{tail}</span>;
  if (!prev) return <span className="rp-delta up">▲ ໃໝ່{tail}</span>;
  const p = Math.round(((cur - prev) / prev) * 100);
  if (p === 0) return <span className="rp-delta flat">0%{tail}</span>;
  return (
    <span className={`rp-delta ${p > 0 ? 'up' : 'down'}`}>
      {p > 0 ? '▲' : '▼'} {Math.abs(p)}%{tail}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="rp-content">
      <div className="rp-sk" style={{ height: 250 }} />
      <div className="rp-sk" style={{ height: 320 }} />
      <div className="rp-2">
        <div className="rp-sk" style={{ height: 240 }} />
        <div className="rp-sk" style={{ height: 240 }} />
      </div>
    </div>
  );
}

// ກຣາຟແທ່ງລາຍວັນ (ຊ້ອນ ອອນລາຍ + ໜ້າຮ້ານ)
function SalesChart({ items }) {
  const [active, setActive] = useState(null);
  const totals = items.map((i) => i.online + i.store);
  const peak = Math.max(0, ...totals);

  if (peak === 0) {
    return <div className="rp-empty">ຍັງບໍ່ມີຍອດຂາຍໃນຊ່ວງນີ້</div>;
  }

  const max = niceMax(peak);
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const n = items.length;
  const many = n > 31;
  const step = many ? Math.ceil(n / 12) : 1;
  const idx = active != null && items[active] ? active : totals.indexOf(peak);
  const it = items[idx];
  const itTotal = it.online + it.store;

  return (
    <>
      <div className="rp-info" aria-live="polite">
        <b>{fmtDate(it.date)}{it.prev ? ' (ຊ່ວງກ່ອນ)' : ''}</b>
        <span>ລວມ <b>{fmt(itTotal)}</b> ກີບ</span>
        <span><i className="rp-dot" style={{ background: ONLINE_COLOR }} />ອອນລາຍ {fmt(it.online)}</span>
        <span><i className="rp-dot" style={{ background: STORE_COLOR }} />ໜ້າຮ້ານ {fmt(it.store)}</span>
        {active == null && n > 2 && <span className="rp-tag">ມື້ຍອດສູງສຸດ</span>}
      </div>

      <div className="rp-chart">
        <div className="rp-y" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{fmtShort(t)}</span>
          ))}
        </div>
        <div className="rp-scroll">
          <div className={`rp-plot${n <= 3 ? ' few' : ''}`} onMouseLeave={() => setActive(null)}>
            <div className="rp-lines" aria-hidden="true">
              {ticks.map((t) => (
                <div key={t} style={{ bottom: `${(t / max) * 100}%` }} />
              ))}
            </div>
            {items.map((d, i) => {
              const total = d.online + d.store;
              const h = (total / max) * 100;
              return (
                <div
                  key={d.key}
                  className={`rp-col${i === idx ? ' on' : ''}${d.prev ? ' prev' : ''}`}
                  style={many ? { flex: '1 1 0', minWidth: 0 } : { flex: '1 0 30px' }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${fmtDate(d.date)} ${fmt(total)} ກີບ`}
                >
                  <div className="rp-area">
                    {total > 0 && (
                      <div className="rp-stack" style={{ height: `${h}%` }}>
                        <div style={{ height: `${ratio(d.store, total)}%`, background: STORE_COLOR }} />
                        <div style={{ height: `${ratio(d.online, total)}%`, background: ONLINE_COLOR }} />
                      </div>
                    )}
                  </div>
                  <div className="rp-xl">{i % step === 0 ? d.label : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ວົງມົນສັດສ່ວນວິທີຈ່າຍເງິນ
function Donut({ slices, total }) {
  const R = 50;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg className="rp-donut" viewBox="0 0 140 140" role="img" aria-label="ສັດສ່ວນວິທີຈ່າຍເງິນ">
      <circle cx="70" cy="70" r={R} fill="none" stroke="#eef0f4" strokeWidth="16" />
      {slices.map((s) => {
        const len = (s.value / total) * C;
        const el = (
          <circle
            key={s.key}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="16"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 70 70)"
          />
        );
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="18" fontWeight="800" fill="#111827">{fmtShort(total)}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#6b7280">ກີບ</text>
    </svg>
  );
}

/* =========================================================
   ໜ້າລາຍງານຫຼັກ
   ========================================================= */
export default function AdminDashboard() {
  const [preset, setPreset] = useState('7');
  const [customFrom, setCustomFrom] = useState(addDays(laoToday(), -6));
  const [customTo, setCustomTo] = useState(laoToday());
  const [data, setData] = useState(null);
  const [prev, setPrev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  async function load(p = preset) {
    const id = ++reqId.current;
    const { from, to } = rangeFor(p, customFrom, customTo);
    const span = daysBetween(from, to);
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(span - 1));
    setLoading(true);
    setError('');
    try {
      // ດຶງຊ່ວງປັດຈຸບັນ + ຊ່ວງກ່ອນໜ້າ (ໄວ້ປຽບທຽບ) ພ້ອມກັນ
      const [cur, prv] = await Promise.all([
        fetchSummary(from, to),
        fetchSummary(prevFrom, prevTo).catch(() => null),
      ]);
      if (id !== reqId.current) return;
      setData(cur);
      setPrev(prv);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e.message || 'ດຶງລາຍງານບໍ່ສຳເລັດ');
      setData(null);
      setPrev(null);
    }
    if (id === reqId.current) setLoading(false);
  }

  useEffect(() => {
    load(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const shown = data ? { from: data.from, to: data.to } : rangeFor(preset, customFrom, customTo);
  const rangeLabel = shown.from === shown.to ? fmtDate(shown.from) : `${fmtDate(shown.from)} – ${fmtDate(shown.to)}`;
  const cmpLabel = data && data.from === data.to ? 'ທຽບມື້ກ່ອນ' : 'ທຽບຊ່ວງກ່ອນ';

  // ຂໍ້ມູນກຣາຟ: ຖ້າເລືອກມື້ດຽວ ໃຫ້ສະແດງທຽບກັບມື້ກ່ອນ
  const chartItems = useMemo(() => {
    if (!data) return [];
    const cur = data.daily.map((d) => ({
      key: d.date, date: d.date, label: shortDate(d.date), online: d.online, store: d.store,
    }));
    if (cur.length === 1 && prev && prev.daily && prev.daily[0]) {
      const p = prev.daily[0];
      return [{ key: p.date, date: p.date, label: shortDate(p.date), online: p.online, store: p.store, prev: true }, ...cur];
    }
    return cur;
  }, [data, prev]);

  // ລວມວິທີຈ່າຍເງິນ (ທັງສອງຊ່ອງທາງ)
  const payList = useMemo(() => {
    if (!data) return [];
    const m = {};
    data.payments.forEach((p) => {
      const k = p.method || 'transfer';
      if (!m[k]) m[k] = { method: k, revenue: 0, bills: 0, online: 0, store: 0 };
      m[k].revenue += p.revenue;
      m[k].bills += p.bills;
      m[k][p.channel] += p.bills;
    });
    return Object.values(m).sort((a, b) => b.revenue - a.revenue);
  }, [data]);
  const payTotal = payList.reduce((s, p) => s + p.revenue, 0);

  const staffTotal = data ? data.staff.reduce((s, x) => s + x.revenue, 0) : 0;
  const topMaxQty = data && data.top.length ? Math.max(...data.top.map((t) => t.qty)) : 1;

  function exportCsv() {
    if (!data) return;
    const rows = [];
    const add = (...r) => rows.push(r);
    add('ລາຍງານຍອດຂາຍ', data.from, data.to);
    add();
    add('ສະຫຼຸບ', 'ຍອດ (ກີບ)', 'ບິນ', 'ຊິ້ນ');
    add('ລວມ', data.total.revenue, data.total.bills, data.total.pieces);
    add('ອອນລາຍ', data.channels.online.revenue, data.channels.online.bills, data.channels.online.pieces);
    add('ໜ້າຮ້ານ', data.channels.store.revenue, data.channels.store.bills, data.channels.store.pieces);
    add();
    add('ວັນທີ', 'ອອນລາຍ', 'ໜ້າຮ້ານ', 'ລວມ');
    data.daily.forEach((d) => add(d.date, d.online, d.store, d.online + d.store));
    add();
    add('ຊ່ອງທາງ', 'ວິທີຈ່າຍ', 'ບິນ', 'ຍອດ (ກີບ)');
    data.payments.forEach((p) => add(CHANNEL_LABEL[p.channel], PAY_LABEL[p.method] || p.method, p.bills, p.revenue));
    add();
    add('#', 'ສິນຄ້າ', 'ອອນລາຍ (ຊິ້ນ)', 'ໜ້າຮ້ານ (ຊິ້ນ)', 'ລວມ (ຊິ້ນ)', 'ຍອດ (ກີບ)');
    data.top.forEach((t, i) => add(i + 1, t.name, t.online_qty, t.store_qty, t.qty, t.revenue));
    add();
    add('ພະນັກງານ', 'ບິນ', 'ຍອດ (ກີບ)');
    data.staff.forEach((s) => add(s.name, s.bills, s.revenue));

    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_${data.from}_${data.to}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const avgOf = (t) => (t && t.bills ? Math.round(t.revenue / t.bills) : 0);

  return (
    <div className="rp">
      <style>{CSS}</style>

      {/* ---------- ແຖບເລືອກຊ່ວງວັນ ---------- */}
      <div className="rp-panel rp-toolbar">
        <div className="rp-pills">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={preset === p.key}
              className={`rp-pill${preset === p.key ? ' on' : ''}`}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="rp-tools">
          <span className="rp-range">{rangeLabel}</span>
          <button type="button" className="rp-btn icon" onClick={() => load()} title="ໂຫຼດໃໝ່" aria-label="ໂຫຼດໃໝ່" disabled={loading}>↻</button>
          <button type="button" className="rp-btn" onClick={exportCsv} disabled={!data}>ສົ່ງອອກ CSV</button>
        </div>
        {preset === 'custom' && (
          <div className="rp-custom">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>ຫາ</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            <button type="button" className="rp-btn solid" onClick={() => load('custom')}>ເບິ່ງລາຍງານ</button>
          </div>
        )}
      </div>

      {error && (
        <div className="rp-panel rp-err">
          <div>
            <b>ດຶງລາຍງານບໍ່ສຳເລັດ</b>
            <div className="rp-sub">{error}</div>
          </div>
          <button type="button" className="rp-btn solid" onClick={() => load()}>ລອງໃໝ່</button>
        </div>
      )}

      {loading && !data && !error && <Skeleton />}

      {data && (
        <div className={`rp-content${loading ? ' busy' : ''}`}>
          {/* ---------- ສະຫຼຸບຍອດຂາຍ ---------- */}
          <section className="rp-panel rp-hero">
            <div className="rp-hero-top">
              <div>
                <div className="rp-label">ຍອດຂາຍລວມ</div>
                <div className="rp-big">{fmt(data.total.revenue)}<span>ກີບ</span></div>
              </div>
              <Delta cur={data.total.revenue} prev={prev ? prev.total.revenue : null} label={cmpLabel} />
            </div>

            <div className="rp-split" aria-hidden="true">
              {data.total.revenue > 0 && (
                <>
                  <div style={{ width: `${ratio(data.channels.online.revenue, data.total.revenue)}%`, background: ONLINE_COLOR }} />
                  <div style={{ width: `${ratio(data.channels.store.revenue, data.total.revenue)}%`, background: STORE_COLOR }} />
                </>
              )}
            </div>

            <div className="rp-chs">
              {['online', 'store'].map((ch) => {
                const c = data.channels[ch];
                const color = ch === 'online' ? ONLINE_COLOR : STORE_COLOR;
                return (
                  <div key={ch} className="rp-ch" style={{ borderLeftColor: color }}>
                    <div className="rp-ch-name">
                      <span>{CHANNEL_LABEL[ch]}</span>
                      <span>{pct(c.revenue, data.total.revenue)}%</span>
                    </div>
                    <div className="rp-ch-val">{fmt(c.revenue)}</div>
                    <div className="rp-sub">{fmt(c.bills)} ບິນ • {fmt(c.pieces)} ຊິ້ນ</div>
                    <Delta cur={c.revenue} prev={prev ? prev.channels[ch].revenue : null} />
                  </div>
                );
              })}
            </div>

            <dl className="rp-strip">
              <div>
                <dt>ຈຳນວນບິນ</dt>
                <dd>{fmt(data.total.bills)}</dd>
                <Delta cur={data.total.bills} prev={prev ? prev.total.bills : null} />
              </div>
              <div>
                <dt>ສະເລ່ຍຕໍ່ບິນ</dt>
                <dd>{fmt(avgOf(data.total))}</dd>
                <Delta cur={avgOf(data.total)} prev={prev ? avgOf(prev.total) : null} />
              </div>
              <div>
                <dt>ຈຳນວນຊິ້ນ</dt>
                <dd>{fmt(data.total.pieces)}</dd>
                <Delta cur={data.total.pieces} prev={prev ? prev.total.pieces : null} />
              </div>
            </dl>
          </section>

          {/* ---------- ກຣາຟຍອດຂາຍ ---------- */}
          <section className="rp-panel">
            <h3 className="rp-h">
              {data.daily.length === 1 && chartItems.length === 2 ? 'ຍອດຂາຍທຽບກັບມື້ກ່ອນ' : 'ຍອດຂາຍລາຍວັນ'}
              <small>ແຕະທີ່ແທ່ງເພື່ອເບິ່ງລາຍລະອຽດ</small>
            </h3>
            <SalesChart key={`${data.from}_${data.to}`} items={chartItems} />
          </section>

          <div className="rp-2">
            {/* ---------- ວິທີຈ່າຍເງິນ ---------- */}
            <section className="rp-panel">
              <h3 className="rp-h">ຍອດແຍກຕາມວິທີຈ່າຍເງິນ</h3>
              {payList.length === 0 || payTotal === 0 ? (
                <div className="rp-empty">ບໍ່ມີຂໍ້ມູນ</div>
              ) : (
                <div className="rp-pay">
                  <Donut
                    total={payTotal}
                    slices={payList.map((p) => ({
                      key: p.method,
                      value: p.revenue,
                      color: PAY_COLOR[p.method] || '#94a3b8',
                    }))}
                  />
                  <ul className="rp-legend">
                    {payList.map((p) => (
                      <li key={p.method} className="rp-leg">
                        <i className="rp-dot lg" style={{ background: PAY_COLOR[p.method] || '#94a3b8' }} />
                        <div>
                          <div className="rp-leg-n">{PAY_LABEL[p.method] || p.method}</div>
                          <div className="rp-sub">
                            {fmt(p.bills)} ບິນ
                            {p.online > 0 && ` • ອອນລາຍ ${p.online}`}
                            {p.store > 0 && ` • ໜ້າຮ້ານ ${p.store}`}
                          </div>
                        </div>
                        <div className="rp-num">
                          <b>{fmt(p.revenue)}</b>
                          <span>{pct(p.revenue, payTotal)}%</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ---------- ພະນັກງານ ---------- */}
            <section className="rp-panel">
              <h3 className="rp-h">ຍອດຂາຍໜ້າຮ້ານແຍກຕາມພະນັກງານ</h3>
              {data.staff.length === 0 ? (
                <div className="rp-empty">ບໍ່ມີຂໍ້ມູນ</div>
              ) : (
                <ul className="rp-list">
                  {data.staff.map((s) => (
                    <li key={s.staff_id} className="rp-srow">
                      <div className="rp-srow-top">
                        <span className="rp-name">{s.name}</span>
                        <b>{fmt(s.revenue)}</b>
                      </div>
                      <div className="rp-meter">
                        <div className="rp-meter-in" style={{ width: `${ratio(s.revenue, staffTotal)}%` }}>
                          <span style={{ background: STORE_COLOR }} />
                        </div>
                      </div>
                      <div className="rp-sub">
                        {fmt(s.bills)} ບິນ • ສະເລ່ຍ {fmt(s.bills ? Math.round(s.revenue / s.bills) : 0)} ຕໍ່ບິນ • {pct(s.revenue, staffTotal)}%
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---------- ສິນຄ້າຂາຍດີ ---------- */}
          <section className="rp-panel">
            <h3 className="rp-h">
              ສິນຄ້າຂາຍດີ Top 10
              <small>
                <i className="rp-dot" style={{ background: ONLINE_COLOR }} />ອອນລາຍ
                <i className="rp-dot" style={{ background: STORE_COLOR, marginLeft: 10 }} />ໜ້າຮ້ານ
              </small>
            </h3>
            {data.top.length === 0 ? (
              <div className="rp-empty">ບໍ່ມີຂໍ້ມູນ</div>
            ) : (
              <ol className="rp-list">
                {data.top.map((t, i) => (
                  <li key={t.product_id} className="rp-row">
                    <span className={`rp-rank${i < 3 ? ' top' : ''}`}>{i + 1}</span>
                    <div className="rp-row-main">
                      <div className="rp-name">{t.name}</div>
                      <div className="rp-meter">
                        <div className="rp-meter-in" style={{ width: `${ratio(t.qty, topMaxQty)}%` }}>
                          <span style={{ flex: t.online_qty, background: ONLINE_COLOR }} />
                          <span style={{ flex: t.store_qty, background: STORE_COLOR }} />
                        </div>
                      </div>
                      <div className="rp-sub">ອອນລາຍ {fmt(t.online_qty)} • ໜ້າຮ້ານ {fmt(t.store_qty)}</div>
                    </div>
                    <div className="rp-num">
                      <b>{fmt(t.revenue)}</b>
                      <span>{fmt(t.qty)} ຊິ້ນ</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="rp-note">ຍອດຂອງສິນຄ້າແຕ່ລະອັນຄິດກ່ອນຫັກສ່ວນລົດທັງບິນ</div>
          </section>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CSS (ຝັງໃນຄອມໂປເນັນ ໃຊ້ຄຼາສຂຶ້ນຕົ້ນ rp- ບໍ່ຊົນກັບໜ້າອື່ນ)
   ========================================================= */
const CSS = `
.rp{--rp-blue:var(--blue,#2563eb);--rp-ink:#111827;--rp-mut:#6b7280;--rp-line:#e6e8ee;
  width:100%;max-width:1200px;margin:0 auto;color:var(--rp-ink);display:flex;flex-direction:column;gap:14px;
  font-variant-numeric:tabular-nums}
.rp *{box-sizing:border-box}
.rp button{font:inherit}
.rp button:focus-visible,.rp .rp-col:focus-visible{outline:2px solid var(--rp-blue);outline-offset:2px}
.rp-content{display:flex;flex-direction:column;gap:14px;transition:opacity .2s}
.rp-content.busy{opacity:.5;pointer-events:none}
.rp-panel{background:#fff;border:1px solid var(--rp-line);border-radius:14px;padding:18px 20px}
.rp-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 14px;font-size:1rem;font-weight:700}
.rp-h small{font-weight:500;color:var(--rp-mut);font-size:.78rem}
.rp-sub{font-size:.8rem;color:var(--rp-mut)}
.rp-empty{text-align:center;color:var(--rp-mut);padding:26px 0;font-size:.9rem}
.rp-note{font-size:.78rem;color:#9ca3af;margin-top:10px}
.rp-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}
.rp-dot.lg{width:12px;height:12px;border-radius:4px;margin:0}

/* ແຖບເຄື່ອງມື */
.rp-toolbar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:space-between;padding:12px 14px}
.rp-pills{display:flex;gap:2px;padding:4px;background:#f1f3f6;border-radius:999px;max-width:100%;overflow-x:auto}
.rp-pill{border:0;background:transparent;padding:8px 16px;border-radius:999px;font-weight:600;font-size:.88rem;color:#4b5563;cursor:pointer;white-space:nowrap;transition:background-color .15s,color .15s}
.rp-pill:hover{color:var(--rp-ink)}
.rp-pill.on{background:var(--rp-blue);color:#fff}
.rp-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rp-range{font-size:.85rem;color:#374151;border:1px solid var(--rp-line);padding:7px 12px;border-radius:10px;white-space:nowrap}
.rp-btn{border:1px solid #d1d5db;background:#fff;color:#374151;padding:7px 14px;border-radius:10px;font-weight:600;font-size:.85rem;cursor:pointer;transition:background-color .15s,border-color .15s}
.rp-btn:hover:not(:disabled){background:#f9fafb;border-color:#9ca3af}
.rp-btn:disabled{opacity:.5;cursor:not-allowed}
.rp-btn.icon{padding:7px 11px;font-size:1rem;line-height:1}
.rp-btn.solid{background:var(--rp-blue);border-color:var(--rp-blue);color:#fff}
.rp-btn.solid:hover:not(:disabled){background:var(--rp-blue);filter:brightness(.93)}
.rp .rp-custom{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%;padding-top:10px;border-top:1px dashed var(--rp-line)}
.rp .rp-custom input{margin:0;width:auto;padding:7px 10px;border:1px solid #d1d5db;border-radius:10px;font:inherit}

/* ສະຫຼຸບຍອດຂາຍ */
.rp-hero{padding:22px 24px}
.rp-hero-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.rp-label{font-size:.88rem;color:var(--rp-mut);font-weight:600}
.rp-big{font-size:clamp(2rem,6vw,3rem);font-weight:800;line-height:1.1;letter-spacing:-.02em;margin-top:2px;overflow-wrap:anywhere}
.rp-big span{font-size:.9rem;font-weight:600;color:var(--rp-mut);margin-left:8px;letter-spacing:0}
.rp-split{display:flex;height:12px;border-radius:999px;overflow:hidden;background:#eef0f4;margin:18px 0 14px}
.rp-split>div{transition:width .5s ease}
.rp-chs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}
.rp-ch{border-left:4px solid #ccc;padding:2px 0 2px 14px;display:flex;flex-direction:column;gap:3px;align-items:flex-start}
.rp-ch-name{display:flex;gap:10px;font-size:.85rem;color:var(--rp-mut);font-weight:600}
.rp-ch-val{font-size:1.45rem;font-weight:800;line-height:1.2}
.rp-strip{display:grid;grid-template-columns:repeat(3,1fr);margin:20px 0 0;border-top:1px solid var(--rp-line)}
.rp-strip>div{padding:14px 12px 0;display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:0}
.rp-strip>div+div{border-left:1px solid var(--rp-line)}
.rp-strip>div:first-child{padding-left:0}
.rp-strip dt{font-size:.8rem;color:var(--rp-mut);font-weight:600}
.rp-strip dd{margin:0;font-size:clamp(1.05rem,3vw,1.4rem);font-weight:800;overflow-wrap:anywhere}

/* ປ້າຍປຽບທຽບ */
.rp-delta{display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:700;padding:3px 9px;border-radius:999px;white-space:nowrap}
.rp-delta i{font-style:normal;font-weight:500;opacity:.8}
.rp-delta.up{background:#dcfce7;color:#15803d}
.rp-delta.down{background:#fee2e2;color:#b91c1c}
.rp-delta.flat{background:#f1f3f6;color:#6b7280}

/* ກຣາຟ */
.rp-info{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center;font-size:.85rem;border:1px solid var(--rp-line);border-radius:10px;padding:9px 12px;margin-bottom:14px}
.rp-tag{font-size:.72rem;font-weight:700;color:#92400e;background:#fef3c7;border-radius:6px;padding:2px 7px}
.rp-chart{display:flex}
.rp-y{position:relative;width:46px;height:200px;flex:none}
.rp-y span{position:absolute;right:8px;transform:translateY(50%);font-size:.7rem;color:#9ca3af}
.rp-scroll{flex:1;min-width:0;overflow-x:auto}
.rp-plot{position:relative;display:flex;min-width:100%}
.rp-lines{position:absolute;left:0;right:0;top:0;height:200px;pointer-events:none}
.rp-lines div{position:absolute;left:0;right:0;border-top:1px dashed #e5e7eb}
.rp-col{position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer}
.rp-col.on::before{content:'';position:absolute;top:0;bottom:22px;left:2px;right:2px;background:#eff6ff;border-radius:8px}
.rp-area{position:relative;height:200px;width:100%;display:flex;align-items:flex-end;justify-content:center}
.rp-stack{width:min(70%,38px);min-height:3px;display:flex;flex-direction:column;border-radius:6px 6px 0 0;overflow:hidden;opacity:.8;transition:height .4s ease,opacity .15s}
.rp-plot.few .rp-stack{width:min(46%,76px)}
.rp-col:hover .rp-stack,.rp-col.on .rp-stack{opacity:1}
.rp-col.prev .rp-stack{opacity:.45}
.rp-col.prev:hover .rp-stack,.rp-col.prev.on .rp-stack{opacity:.7}
.rp-xl{position:relative;height:22px;line-height:22px;font-size:.68rem;color:var(--rp-mut);white-space:nowrap}

/* ວິທີຈ່າຍເງິນ */
.rp-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:14px}
.rp-pay{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.rp-donut{width:150px;height:150px;flex:none;margin:0 auto}
.rp-legend{flex:1 1 220px;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px}
.rp-leg{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
.rp-leg-n{font-weight:700;font-size:.92rem}
.rp-num{display:flex;flex-direction:column;text-align:right;white-space:nowrap}
.rp-num b{font-size:.95rem}
.rp-num span{font-size:.78rem;color:var(--rp-mut)}

/* ລາຍການ (Top 10 / ພະນັກງານ) */
.rp-list{list-style:none;margin:0;padding:0}
.rp-row{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #f1f3f6}
.rp-row:first-child,.rp-srow:first-child{border-top:0;padding-top:0}
.rp-rank{font-size:1.05rem;font-weight:600;color:#9ca3af;text-align:center}
.rp-rank.top{font-weight:800;color:var(--rp-ink)}
.rp-row-main{min-width:0}
.rp-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.rp-meter{height:7px;border-radius:999px;background:#f1f3f6;margin:7px 0 5px;overflow:hidden}
.rp-meter-in{display:flex;height:100%;border-radius:999px;overflow:hidden;transition:width .5s ease}
.rp-meter-in span{display:block;height:100%;min-width:0}
.rp-meter-in:only-child span:only-child{flex:1}
.rp-srow{padding:12px 0;border-top:1px solid #f1f3f6}
.rp-srow-top{display:flex;justify-content:space-between;gap:12px;align-items:baseline}

/* ໂຫຼດ / ຜິດພາດ */
.rp-err{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-color:#fecaca;background:#fef2f2;color:#991b1b}
.rp-sk{border-radius:14px;background:linear-gradient(90deg,#eef0f4 25%,#f7f8fa 37%,#eef0f4 63%);background-size:400% 100%;animation:rp-sh 1.3s ease infinite}
@keyframes rp-sh{0%{background-position:100% 50%}100%{background-position:0 50%}}

@media (max-width:560px){
  .rp-panel{padding:14px}
  .rp-hero{padding:16px}
  .rp-tools{width:100%}
  .rp-range{flex:1;text-align:center}
  .rp-y{width:38px}
}
@media (prefers-reduced-motion:reduce){
  .rp *{transition:none!important;animation:none!important}
}
`;