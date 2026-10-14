import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost, clearToken } from '../../api';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-profile-info.js';

const BASE = '/api/customer-account';
const MAX_NAME = 30;
const REVEAL_SECONDS = 30; // ເບິ່ງວັນເກີດໄດ້ຈັກວິນາທີ ແລ້ວເຊື່ອງອັດຕະໂນມັດ
const digits = (v) => v.replace(/\D/g, '').slice(0, 6);

// YYYY-MM-DD → DD/MM/YYYY
function fmtBirth(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s || '';
}

const css = `
.ai-wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 40px; }
.ai-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.ai-back {
  background: none; border: none; font-size: 30px; line-height: 1; padding: 0 8px 4px 0;
  cursor: pointer; color: var(--cust-text);
}
.ai-title { font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--cust-text); }
.ai-sec { font-size: 0.95rem; font-weight: 800; color: var(--cust-text); margin: 24px 4px 10px; }

.ai-card {
  background: var(--cust-surface); border: 1px solid var(--cust-border); border-radius: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04); overflow: hidden;
}
.ai-card.danger { border-color: #fca5a5; }
.ai-item + .ai-item { border-top: 1px solid var(--cust-border); }

/* ແຖວຂໍ້ມູນ */
.ai-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 16px 18px; }
.ai-main { flex: 1 1 160px; min-width: 0; }
.ai-lb { font-size: 0.82rem; color: var(--cust-text-muted); margin-bottom: 3px; }
.ai-lb.red { color: #dc2626; font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
.ai-val { font-weight: 700; font-size: 1.08rem; color: var(--cust-text); overflow-wrap: anywhere; }
.ai-val.mask { letter-spacing: 0.2em; color: var(--cust-text-muted); }
.ai-val.empty { font-weight: 500; color: var(--cust-text-muted); }
.ai-note { font-size: 0.78rem; color: var(--cust-text-muted); margin-top: 4px; line-height: 1.45; }
.ai-note.warn { color: #b45309; }
.ai-note.ok { color: #16a34a; font-weight: 700; }

.ai-acts { display: flex; gap: 8px; flex: 0 0 auto; }
.ai-btn {
  padding: 7px 16px; border-radius: 999px; font-size: 0.82rem; font-weight: 700; white-space: nowrap;
  border: 1px solid var(--gold); color: var(--cust-gold-text); background: transparent;
  cursor: pointer; font-family: inherit; transition: background-color 0.15s, color 0.15s;
}
.ai-btn:hover { background: var(--gold); color: #fff; }
.ai-btn.quiet { border-color: var(--cust-border); color: var(--cust-text-muted); }
.ai-btn.quiet:hover { background: var(--cust-hover); color: var(--cust-text); }
.ai-btn.red { border-color: #dc2626; color: #dc2626; }
.ai-btn.red:hover { background: #dc2626; color: #fff; }
.ai-btn:focus-visible, .ai-cancel:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

/* ຟອມທີ່ກາງອອກ */
.ai-editor { padding: 16px 18px 18px; background: var(--cust-surface-soft); border-top: 1px solid var(--cust-border); }
.ai-field { display: block; margin-bottom: 12px; }
.ai-flb { display: block; font-size: 0.82rem; color: var(--cust-text-muted); margin-bottom: 5px; }
.ai-msg { margin: 0 0 10px; font-size: 0.88rem; color: #dc2626; }
.ai-hint { margin: 0 0 12px; font-size: 0.82rem; color: var(--cust-text-muted); line-height: 1.5; }
.ai-actions { display: flex; gap: 10px; margin-top: 4px; }
.ai-actions .pi-save, .ai-del { flex: 1; margin-top: 0; }
.ai-cancel {
  padding: 13px 18px; border-radius: 12px; border: 1px solid var(--cust-border);
  background: var(--cust-surface); color: var(--cust-text); font-weight: 600; font-size: 0.95rem;
  cursor: pointer; font-family: inherit;
}
.ai-del {
  padding: 13px 10px; border-radius: 12px; border: none; background: #dc2626; color: #fff;
  font-weight: 700; font-size: 0.98rem; cursor: pointer; font-family: inherit;
}
.ai-del:disabled { opacity: 0.6; cursor: default; }

.pi-input {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; margin: 0;
  border: 1px solid #e5e7eb; background: #fff; font-size: 1rem; color: #1f2937; font-family: inherit;
}
.pi-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212, 165, 72, 0.15); }
.pi-save {
  margin-top: 16px; width: 100%; padding: 13px 10px; border-radius: 12px; border: none;
  background: var(--gold); color: #fff; font-weight: 700; font-size: 0.98rem; cursor: pointer;
  box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3); font-family: inherit;
}
.pi-save:hover:not(:disabled) { filter: brightness(1.06); }
.pi-save:disabled { opacity: 0.6; cursor: default; }

/* ກຳລັງໂຫຼດ */
.ai-sk { border-radius: 14px; background: var(--cust-bar-bg); animation: ai-pulse 1.2s ease-in-out infinite; margin-top: 14px; }
@keyframes ai-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

@media (max-width: 420px) {
  .ai-wrap { padding: 16px 12px 32px; }
  .ai-row { padding: 14px; }
  .ai-editor { padding: 14px; }
}
@media (prefers-reduced-motion: reduce) { .ai-sk { animation: none; } }
`;

/* ---------- ສ່ວນຍ່ອຍ ---------- */
function PinField({ label, value, onChange, autoComplete = 'current-password', autoFocus = false }) {
  return (
    <label className="ai-field">
      <span className="ai-flb">{label}</span>
      <input
        className="pi-input"
        type="password"
        inputMode="numeric"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(digits(e.target.value))}
      />
    </label>
  );
}

function EditorActions({ busy, label, onCancel, danger = false }) {
  const { t } = usePageT(dict);
  return (
    <div className="ai-actions">
      <button type="button" className="ai-cancel" onClick={onCancel}>
        {t('common.cancel')}
      </button>
      <button type="submit" className={danger ? 'ai-del' : 'pi-save'} disabled={busy}>
        {busy ? t('acc.saving') : label}
      </button>
    </div>
  );
}

function AccountInfoInner() {
  const navigate = useNavigate();
  const { t } = usePageT(dict);
  const today = new Date().toISOString().slice(0, 10);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [hasBirth, setHasBirth] = useState(null); // null = ຍັງບໍ່ຮູ້
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // ຟອມທີ່ກາງຢູ່: 'name' | 'reveal' | 'birth' | 'pin' | 'delete' | null (ເປີດໄດ້ເທື່ອລະອັນ)
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [flash, setFlash] = useState(null); // { key, textKey }
  const [confirmDel, setConfirmDel] = useState(false); // ກ່ອງຢືນຢັນລຶບບັນຊີ (ແທນ window.confirm)

  // ຄ່າໃນຟອມ
  const [nameInput, setNameInput] = useState('');
  const [curPin, setCurPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [birthInput, setBirthInput] = useState('');
  const [pin, setPin] = useState('');
  const [revealed, setRevealed] = useState(null); // YYYY-MM-DD ເມື່ອເບິ່ງໄດ້

  useEffect(() => {
    (async () => {
      try {
        const [me, birth] = await Promise.all([
          apiGet('/api/customer-auth/me'),
          apiGet(`${BASE}/birth-date`),
        ]);
        if (me.status === 401 || birth.status === 401) {
          navigate('/menu/login');
          return;
        }
        if (me.ok) {
          setPhone(me.data.phone || '');
          setName(me.data.name || '');
        } else {
          setLoadError(true);
        }
        if (birth.ok) setHasBirth(!!birth.data.has_birth_date);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ເຊື່ອງວັນເກີດອັດຕະໂນມັດ
  useEffect(() => {
    if (revealed === null) return undefined;
    const timer = setTimeout(() => setRevealed(null), REVEAL_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [revealed]);

  // ເຊື່ອງຂໍ້ຄວາມ "ບັນທຶກແລ້ວ ✓"
  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(timer);
  }, [flash]);

  // ແປຂໍ້ຄວາມຜິດພາດຈາກ backend ເປັນພາສາຂອງລູກຄ້າ
  // 429 = ຖືກລັອກ (ມີ seconds_left), 401 = PIN ຜິດ (ມີ attempts_left), 400 = ອີງຕາມ context
  function errText(res, fallbackKey, status400Key) {
    const st = res && res.status;
    const d = (res && res.data) || {};
    if (st === 429) {
      const s = Math.ceil(Number(d.seconds_left));
      if (!s || s < 0) return t('acc.errLockedGeneric');
      const when = s >= 60 ? t('acc.timeMin', { n: Math.ceil(s / 60) }) : t('acc.timeSec', { n: s });
      return t('acc.errLocked', { when });
    }
    if (st === 401) {
      const left = Number(d.attempts_left);
      return Number.isFinite(left) && d.attempts_left !== undefined && left > 0
        ? `${t('acc.errPinWrong')} (${t('acc.attemptsLeft', { n: left })})`
        : t('acc.errPinWrong');
    }
    if (st === 400 && status400Key) return t(status400Key);
    return t(fallbackKey);
  }

  function resetFields() {
    setMsg('');
    setCurPin('');
    setNewPin('');
    setNewPin2('');
    setPin('');
  }
  function openEditor(key) {
    resetFields();
    setOpen(key);
    setNameInput(key === 'name' ? name : '');
    setBirthInput(key === 'birth' && revealed ? revealed : '');
  }
  function closeEditor() {
    resetFields();
    setOpen(null);
  }
  function toggle(key) {
    if (open === key) closeEditor();
    else openEditor(key);
  }

  /* ----- ປ່ຽນຊື່ ----- */
  async function saveName(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return setMsg(t('acc.errNameEmpty'));
    if (trimmed.length > MAX_NAME) return setMsg(t('acc.errNameLong', { max: MAX_NAME }));
    setBusy(true);
    setMsg('');
    try {
      const res = await apiPost('/api/customer-auth/me/name', { name: trimmed });
      if (res.ok) {
        setName(trimmed);
        closeEditor();
        setFlash({ key: 'name', textKey: 'acc.okName' });
      } else {
        setMsg(errText(res, 'acc.errSave'));
      }
    } catch (err) {
      console.error(err);
      setMsg(t('acc.errSave'));
    }
    setBusy(false);
  }

  /* ----- ເບິ່ງວັນເກີດ (ຕ້ອງໃສ່ PIN) ----- */
  async function reveal(e) {
    e.preventDefault();
    if (pin.length < 4) return setMsg(t('acc.errPin'));
    setBusy(true);
    setMsg('');
    try {
      const res = await apiPost(`${BASE}/birth-date/reveal`, { pin });
      if (res.ok) {
        if (res.data.birth_date) setRevealed(res.data.birth_date);
        else setHasBirth(false);
        closeEditor();
      } else {
        setMsg(errText(res, 'acc.errReveal'));
      }
    } catch (err) {
      console.error(err);
      setMsg(t('acc.errReveal'));
    }
    setBusy(false);
  }

  /* ----- ຕັ້ງ / ແກ້ວັນເກີດ ----- */
  async function saveBirth(e) {
    e.preventDefault();
    if (!birthInput) return setMsg(t('acc.errBirthEmpty'));
    if (pin.length < 4) return setMsg(t('acc.errPinConfirm'));
    setBusy(true);
    setMsg('');
    try {
      const res = await apiPost(`${BASE}/birth-date`, { birth_date: birthInput, pin });
      if (res.ok) {
        setHasBirth(true);
        setRevealed(birthInput);
        closeEditor();
        setFlash({ key: 'birth', textKey: 'acc.okBirth' });
      } else {
        setMsg(errText(res, 'acc.errSave', 'acc.errBirthInvalid'));
      }
    } catch (err) {
      console.error(err);
      setMsg(t('acc.errSave'));
    }
    setBusy(false);
  }

  /* ----- ປ່ຽນ PIN ----- */
  async function changePin(e) {
    e.preventDefault();
    if (curPin.length < 4) return setMsg(t('acc.errCurPin'));
    if (!/^\d{4,6}$/.test(newPin)) return setMsg(t('acc.errNewPin'));
    if (newPin !== newPin2) return setMsg(t('acc.errMismatch'));
    if (newPin === curPin) return setMsg(t('acc.errSamePin'));
    setBusy(true);
    setMsg('');
    try {
      const res = await apiPost(`${BASE}/change-pin`, { current_pin: curPin, new_pin: newPin });
      if (res.ok) {
        closeEditor();
        setFlash({ key: 'pin', textKey: 'acc.okPin' });
      } else {
        setMsg(errText(res, 'acc.errChangePin'));
      }
    } catch (err) {
      console.error(err);
      setMsg(t('acc.errChangePin'));
    }
    setBusy(false);
  }

  /* ----- ລຶບບັນຊີ: ກົດປຸ່ມ → ເປີດກ່ອງຢືນຢັນ → ລຶບຈິງ ----- */
  function deleteAccount(e) {
    e.preventDefault();
    if (pin.length < 4) return setMsg(t('acc.errPinConfirm'));
    setMsg('');
    setConfirmDel(true);
  }

  async function doDelete() {
    setConfirmDel(false);
    setBusy(true);
    setMsg('');
    try {
      const res = await apiPost(`${BASE}/delete`, { pin });
      if (res.ok) {
        clearToken();
        navigate('/menu/login');
        return;
      }
      // 400 ຈາກເສັ້ນທາງນີ້ = ມີອໍເດີທີ່ຍັງບໍ່ສຳເລັດ (PIN ຜ່ານແລ້ວ)
      setMsg(errText(res, 'acc.errDel', 'acc.errDelPending'));
    } catch (err) {
      console.error(err);
      setMsg(t('acc.errDel'));
    }
    setBusy(false);
  }

  const flashFor = (key) =>
    flash && flash.key === key ? <div className="ai-note ok">{t(flash.textKey)}</div> : null;

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="ai-wrap">
        <div className="ai-head">
          <button className="ai-back" onClick={() => navigate('/menu/profile')} aria-label={t('common.back')}>
            ‹
          </button>
          <h1 className="ai-title">{t('acc.title')}</h1>
        </div>

        {loading ? (
          <>
            <div className="ai-sk" style={{ height: 200 }} />
            <div className="ai-sk" style={{ height: 90 }} />
          </>
        ) : loadError ? (
          <p style={{ color: '#dc2626' }}>{t('acc.loadFail')}</p>
        ) : (
          <>
            {/* ===== ຂໍ້ມູນສ່ວນຕົວ ===== */}
            <h2 className="ai-sec">{t('acc.secPersonal')}</h2>
            <section className="ai-card">
              {/* ຊື່ */}
              <div className="ai-item">
                <div className="ai-row">
                  <div className="ai-main">
                    <div className="ai-lb">{t('acc.name')}</div>
                    <div className={`ai-val${name ? '' : ' empty'}`}>{name || t('acc.noName')}</div>
                    {flashFor('name')}
                  </div>
                  <div className="ai-acts">
                    <button
                      type="button"
                      className={`ai-btn${open === 'name' ? ' quiet' : ''}`}
                      aria-expanded={open === 'name'}
                      onClick={() => toggle('name')}
                    >
                      {open === 'name' ? t('acc.close') : t('acc.changeName')}
                    </button>
                  </div>
                </div>
                {open === 'name' && (
                  <form className="ai-editor" onSubmit={saveName}>
                    <label className="ai-field">
                      <span className="ai-flb">{t('acc.newName', { max: MAX_NAME })}</span>
                      <input
                        className="pi-input"
                        type="text"
                        autoFocus
                        maxLength={MAX_NAME}
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                      />
                    </label>
                    {msg && <p className="ai-msg">{msg}</p>}
                    <EditorActions busy={busy} label={t('acc.saveName')} onCancel={closeEditor} />
                  </form>
                )}
              </div>

              {/* ເບີໂທ */}
              <div className="ai-item">
                <div className="ai-row">
                  <div className="ai-main">
                    <div className="ai-lb">{t('acc.phone')}</div>
                    <div className="ai-val">{phone}</div>
                    <div className="ai-note">{t('acc.phoneNote')}</div>
                  </div>
                </div>
              </div>

              {/* ວັນເກີດ */}
              <div className="ai-item">
                <div className="ai-row">
                  <div className="ai-main">
                    <div className="ai-lb">{t('acc.birth')}</div>
                    {hasBirth === false ? (
                      <>
                        <div className="ai-val empty">{t('acc.birthNone')}</div>
                        <div className="ai-note warn">{t('acc.birthWarn')}</div>
                      </>
                    ) : revealed !== null ? (
                      <>
                        <div className="ai-val">{fmtBirth(revealed)}</div>
                        <div className="ai-note">{t('acc.birthAutoHide', { s: REVEAL_SECONDS })}</div>
                      </>
                    ) : (
                      <>
                        <div className="ai-val mask">••/••/••••</div>
                        <div className="ai-note">{t('acc.birthEnterPin')}</div>
                      </>
                    )}
                    {flashFor('birth')}
                  </div>
                  <div className="ai-acts">
                    {hasBirth === false ? (
                      <button
                        type="button"
                        className={`ai-btn${open === 'birth' ? ' quiet' : ''}`}
                        aria-expanded={open === 'birth'}
                        onClick={() => toggle('birth')}
                      >
                        {open === 'birth' ? t('acc.close') : t('acc.setBirth')}
                      </button>
                    ) : revealed !== null ? (
                      <>
                        <button
                          type="button"
                          className={`ai-btn${open === 'birth' ? ' quiet' : ''}`}
                          aria-expanded={open === 'birth'}
                          onClick={() => toggle('birth')}
                        >
                          {open === 'birth' ? t('acc.close') : t('acc.edit')}
                        </button>
                        <button
                          type="button"
                          className="ai-btn quiet"
                          onClick={() => {
                            setRevealed(null);
                            if (open === 'birth') closeEditor();
                          }}
                        >
                          {t('acc.hide')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={`ai-btn${open === 'reveal' ? ' quiet' : ''}`}
                        aria-expanded={open === 'reveal'}
                        onClick={() => toggle('reveal')}
                      >
                        {open === 'reveal' ? t('acc.close') : t('acc.view')}
                      </button>
                    )}
                  </div>
                </div>

                {open === 'reveal' && (
                  <form className="ai-editor" onSubmit={reveal}>
                    <PinField label={t('acc.pinToView')} value={pin} onChange={setPin} autoFocus />
                    {msg && <p className="ai-msg">{msg}</p>}
                    <EditorActions busy={busy} label={t('acc.viewBirth')} onCancel={closeEditor} />
                  </form>
                )}

                {open === 'birth' && (
                  <form className="ai-editor" onSubmit={saveBirth}>
                    <p className="ai-hint">{t('acc.birthHint')}</p>
                    <label className="ai-field">
                      <span className="ai-flb">{t('acc.birthLabel')}</span>
                      <input
                        className="pi-input"
                        type="date"
                        max={today}
                        min="1900-01-01"
                        value={birthInput}
                        onChange={(e) => setBirthInput(e.target.value)}
                      />
                    </label>
                    <PinField label={t('acc.pinToConfirm')} value={pin} onChange={setPin} />
                    {msg && <p className="ai-msg">{msg}</p>}
                    <EditorActions busy={busy} label={t('acc.saveBirth')} onCancel={closeEditor} />
                  </form>
                )}
              </div>
            </section>

            {/* ===== ຄວາມປອດໄພ ===== */}
            <h2 className="ai-sec">{t('acc.secSecurity')}</h2>
            <section className="ai-card">
              <div className="ai-item">
                <div className="ai-row">
                  <div className="ai-main">
                    <div className="ai-lb">{t('acc.pin')}</div>
                    <div className="ai-val mask">••••••</div>
                    <div className="ai-note">{t('acc.pinNote')}</div>
                    {flashFor('pin')}
                  </div>
                  <div className="ai-acts">
                    <button
                      type="button"
                      className={`ai-btn${open === 'pin' ? ' quiet' : ''}`}
                      aria-expanded={open === 'pin'}
                      onClick={() => toggle('pin')}
                    >
                      {open === 'pin' ? t('acc.close') : t('acc.changePin')}
                    </button>
                  </div>
                </div>
                {open === 'pin' && (
                  <form className="ai-editor" onSubmit={changePin}>
                    <p className="ai-hint">{t('acc.pinHint')}</p>
                    <PinField label={t('acc.curPin')} value={curPin} onChange={setCurPin} autoFocus />
                    <PinField label={t('acc.newPin')} value={newPin} onChange={setNewPin} autoComplete="new-password" />
                    <PinField label={t('acc.newPin2')} value={newPin2} onChange={setNewPin2} autoComplete="new-password" />
                    {msg && <p className="ai-msg">{msg}</p>}
                    <EditorActions busy={busy} label={t('acc.changePin')} onCancel={closeEditor} />
                  </form>
                )}
              </div>
            </section>

            {/* ===== ລຶບບັນຊີ ===== */}
            <h2 className="ai-sec">{t('acc.delSec')}</h2>
            <section className="ai-card danger">
              <div className="ai-item">
                <div className="ai-row">
                  <div className="ai-main">
                    <div className="ai-lb red">{t('acc.delTitle')}</div>
                    <div className="ai-note">{t('acc.delNote')}</div>
                  </div>
                  <div className="ai-acts">
                    <button
                      type="button"
                      className={`ai-btn ${open === 'delete' ? 'quiet' : 'red'}`}
                      aria-expanded={open === 'delete'}
                      onClick={() => toggle('delete')}
                    >
                      {open === 'delete' ? t('acc.close') : t('acc.delSec')}
                    </button>
                  </div>
                </div>
                {open === 'delete' && (
                  <form className="ai-editor" onSubmit={deleteAccount}>
                    <PinField label={t('acc.pinToConfirm')} value={pin} onChange={setPin} autoFocus />
                    {msg && <p className="ai-msg">{msg}</p>}
                    <EditorActions busy={busy} label={t('acc.delConfirmBtn')} onCancel={closeEditor} danger />
                  </form>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmDel}
        message={t('acc.delConfirm')}
        danger
        confirmText={t('acc.delConfirmBtn')}
        onConfirm={doDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  );
}

export default function ProfileInfo() {
  return (
    <CartProvider>
      <AccountInfoInner />
    </CartProvider>
  );
}