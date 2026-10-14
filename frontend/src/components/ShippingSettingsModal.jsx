import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api.js';
import { usePageT } from '../useT.js';
import dict from '../locales/shipping-settings.js';

const css = `
.ss-box{background:#fff;color:#1f2937;max-width:420px;width:92%;max-height:90vh;overflow-y:auto}
.ss-title{margin:0 0 4px;font-size:1.15rem;color:var(--navy,#1f2937)}
.ss-desc{margin:0 0 16px;font-size:.88rem;color:#6b7280}
.ss-field{display:block;margin-bottom:14px}
.ss-lb{display:block;font-size:.85rem;font-weight:700;margin-bottom:5px}
.ss-box input.ss-input{width:100%;box-sizing:border-box;margin:0;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:1.05rem;font-weight:700;font-family:inherit;background:#fff;color:#1f2937}
.ss-box input.ss-input:focus{outline:none;border-color:var(--gold,#c9a227);box-shadow:0 0 0 3px rgba(201,162,39,.15)}
.ss-hint{display:block;font-size:.76rem;color:#6b7280;margin-top:4px}
.ss-pv{background:#fffaf0;border:1px solid #f1e3b8;border-radius:12px;padding:11px 13px;margin:4px 0 8px;font-size:.88rem;line-height:1.5}
.ss-pv b{display:block;font-size:.76rem;color:#9a7412;margin-bottom:2px}
.ss-note{font-size:.76rem;color:#6b7280;margin:0 0 14px}
.ss-err{color:#dc2626;font-size:.88rem;margin:0 0 10px}
.ss-act{display:flex;gap:10px}
.ss-act button{flex:1;padding:12px 10px;border-radius:10px;font-weight:700;font-family:inherit;font-size:.95rem;cursor:pointer}
.ss-cancel{border:1px solid #dfe3e8;background:#fff;color:#374151}
.ss-save{border:none;background:var(--gold,#c9a227);color:#fff}
.ss-save:disabled,.ss-cancel:disabled{opacity:.6;cursor:default}
`;

const digits = (v) => String(v).replace(/\D/g, '').slice(0, 9);
const show = (v) => (v === '' ? '' : Number(v).toLocaleString('en-US'));

export default function ShippingSettingsModal({ open, onClose, onSaved }) {
  const { t } = usePageT(dict);
  const kip = t('common.kip');
  const [fee, setFee] = useState('');
  const [freeMin, setFreeMin] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setMsg('');
    setLoading(true);
    (async () => {
      try {
        const r = await apiGet('/api/settings/shipping');
        if (!alive) return;
        if (r.ok) {
          setFee(String(Number(r.data.flat_fee) || 0));
          setFreeMin(String(Number(r.data.free_min) || 0));
        } else {
          setMsg(t('ss.errLoad'));
        }
      } catch (e) {
        if (alive) setMsg(t('ss.errLoad'));
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const feeN = Number(fee) || 0;
  const minN = Number(freeMin) || 0;
  let preview;
  if (feeN === 0) preview = t('ss.pvNone');
  else if (minN === 0) preview = t('ss.pvAlways', { fee: feeN.toLocaleString('en-US'), kip });
  else preview = t('ss.pvRule', { fee: feeN.toLocaleString('en-US'), min: minN.toLocaleString('en-US'), kip });

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const r = await apiPut('/api/settings/shipping', { flat_fee: feeN, free_min: minN });
      if (r.ok && r.data && r.data.success) {
        setSaving(false);
        if (onSaved) onSaved(t('ss.saved'));
        onClose();
        return;
      }
      setMsg((r.data && r.data.error) || t('ss.errSave'));
    } catch (e) {
      setMsg(t('ss.errSave'));
    }
    setSaving(false);
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <style>{css}</style>
      <div className="modal-box ss-box">
        <h2 className="ss-title">🚚 {t('ss.title')}</h2>
        <p className="ss-desc">{t('ss.desc')}</p>

        <label className="ss-field">
          <span className="ss-lb">{t('ss.feeLabel')}</span>
          <input
            className="ss-input"
            type="text"
            inputMode="numeric"
            disabled={loading || saving}
            value={show(fee)}
            onChange={(e) => setFee(digits(e.target.value))}
          />
          <span className="ss-hint">{t('ss.feeHint')}</span>
        </label>

        <label className="ss-field">
          <span className="ss-lb">{t('ss.freeLabel')}</span>
          <input
            className="ss-input"
            type="text"
            inputMode="numeric"
            disabled={loading || saving}
            value={show(freeMin)}
            onChange={(e) => setFreeMin(digits(e.target.value))}
          />
          <span className="ss-hint">{t('ss.freeHint')}</span>
        </label>

        <div className="ss-pv">
          <b>{t('ss.preview')}</b>
          {preview}
        </div>
        <p className="ss-note">{t('ss.note')}</p>

        {msg && <p className="ss-err">{msg}</p>}

        <div className="ss-act">
          <button type="button" className="ss-cancel" disabled={saving} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="ss-save" disabled={loading || saving} onClick={save}>
            {saving ? t('ss.saving') : t('ss.save')}
          </button>
        </div>
      </div>
    </div>
  );
}