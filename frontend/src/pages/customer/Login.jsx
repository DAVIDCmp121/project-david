import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, saveToken } from '../../api.js';
import LoginShell, {
  PhoneIcon, LockIcon, UserIcon, CalendarIcon, EyeIcon,
} from '../../components/LoginShell.jsx';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-login.js';

// ແປງວັນເກີດທີ່ລູກຄ້າພິມ (25/12/2000 ຫຼື 2000-12-25) ເປັນ YYYY-MM-DD ທີ່ backend ໃຊ້ປຽບທຽບ
// ຖ້າຮູບແບບຜິດ ຫຼື ເປັນວັນທີ່ບໍ່ມີຈິງ ຫຼື ເປັນອະນາຄົດ ຈະຄືນຄ່າວ່າງ
function normBirth(s) {
  const v = String(s || '').trim();
  let y;
  let m;
  let d;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (x) {
    y = x[1]; m = x[2]; d = x[3];
  } else {
    x = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(v);
    if (!x) return '';
    d = x[1]; m = x[2]; y = x[3];
  }
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    dt.getFullYear() !== Number(y) ||
    dt.getMonth() !== Number(m) - 1 ||
    dt.getDate() !== Number(d)
  ) return '';
  if (dt > new Date()) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CustomerLogin() {
  const { t } = usePageT(dict);

  const [tab, setTab] = useState('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [regBirthDate, setRegBirthDate] = useState('');
  const [authError, setAuthError] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpPhone, setFpPhone] = useState('');
  const [fpBirthDate, setFpBirthDate] = useState('');
  const [fpNewPin, setFpNewPin] = useState('');
  const [fpNewPinConfirm, setFpNewPinConfirm] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { ok } = await apiGet('/api/customer-auth/me');
      if (ok) navigate('/menu', { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ຂໍ້ຄວາມເມື່ອຖືກລັອກ: "ລອງໃໝ່ໃນ 5 ນາທີ" (backend ສົ່ງ seconds_left ມາໃຫ້)
  function lockedText(data) {
    const s = Math.ceil(Number(data && data.seconds_left));
    if (!s || s < 0) return t('cl.errLockedGeneric');
    const when = s >= 60 ? t('cl.timeMin', { n: Math.ceil(s / 60) }) : t('cl.timeSec', { n: s });
    return t('cl.errLocked', { when });
  }

  async function submitLogin() {
    setAuthError('');
    if (!loginPhone || !loginPin) {
      setAuthError(t('cl.errLoginEmpty'));
      return;
    }
    try {
      const { status, data } = await apiPost('/api/customer-auth/login', { phone: loginPhone, pin: loginPin });
      if (status === 429) {
        setAuthError(lockedText(data));
        return;
      }
      if (data && data.success) {
        saveToken(data.token);
        navigate('/menu');
      } else {
        setAuthError(t('cl.errLoginFail'));
      }
    } catch (err) {
      console.error(err);
      setAuthError(t('cl.errConn'));
    }
  }

  async function submitRegister() {
    setAuthError('');
    if (!regPhone || !regPin || !regBirthDate) {
      setAuthError(t('cl.errRegEmpty'));
      return;
    }
    const birth = normBirth(regBirthDate);
    if (!birth) {
      setAuthError(t('cl.errBirthFormat'));
      return;
    }
    try {
      const { data } = await apiPost('/api/customer-auth/register', {
        phone: regPhone, pin: regPin, name: regName, birth_date: birth,
      });
      if (data && data.success) {
        saveToken(data.token);
        navigate('/menu');
      } else {
        setAuthError(t('cl.errRegFail'));
      }
    } catch (err) {
      console.error(err);
      setAuthError(t('cl.errConn'));
    }
  }

  async function submitForgotPin() {
    setFpError('');
    setFpSuccess('');
    if (!fpPhone || !fpBirthDate || !fpNewPin || !fpNewPinConfirm) {
      setFpError(t('cl.fpEmpty'));
      return;
    }
    if (fpNewPin !== fpNewPinConfirm) {
      setFpError(t('cl.fpMismatch'));
      return;
    }
    const birth = normBirth(fpBirthDate);
    if (!birth) {
      setFpError(t('cl.errBirthFormat'));
      return;
    }
    try {
      const { status, data } = await apiPost('/api/customer-auth/forgot-pin', {
        phone: fpPhone, birth_date: birth, new_pin: fpNewPin,
      });
      if (status === 429) {
        setFpError(lockedText(data));
        return;
      }
      if (data && data.success) {
        setFpSuccess(t('cl.fpOk'));
        setTimeout(() => {
          setForgotOpen(false);
          setLoginPhone(fpPhone);
        }, 1500);
      } else {
        setFpError(t('cl.fpFail'));
      }
    } catch (err) {
      console.error(err);
      setFpError(t('cl.errConn'));
    }
  }

  const footer =
    tab === 'login' ? (
      <>{t('cl.noAccount')} <button onClick={() => { setTab('register'); setAuthError(''); }}>{t('cl.createAccount')}</button></>
    ) : (
      <>{t('cl.haveAccount')} <button onClick={() => { setTab('login'); setAuthError(''); }}>{t('cl.submitLogin')}</button></>
    );

  return (
    <>
      <LoginShell
        badge={t('cl.badge')}
        subtitle={tab === 'login' ? t('cl.subLogin') : t('cl.subRegister')}
        footer={footer}
      >
        {tab === 'login' && (
          <>
            <div className="lg-field">
              <span className="lg-field-icon"><PhoneIcon /></span>
              <input type="tel" placeholder={t('cl.phone')} value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} />
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><LockIcon /></span>
              <input
                type={showLoginPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                placeholder={t('cl.pin')}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
              />
              <button type="button" className="lg-eye-btn" onClick={() => setShowLoginPin((v) => !v)} aria-label={t('cl.togglePin')}>
                <EyeIcon off={showLoginPin} />
              </button>
            </div>
            <button className="lg-submit" onClick={submitLogin}>{t('cl.submitLogin')}</button>
            <p className="lg-forgot" onClick={() => setForgotOpen(true)}>{t('cl.forgot')}</p>
          </>
        )}

        {tab === 'register' && (
          <>
            <div className="lg-field">
              <span className="lg-field-icon"><UserIcon /></span>
              <input type="text" placeholder={t('cl.name')} value={regName} onChange={(e) => setRegName(e.target.value)} />
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><PhoneIcon /></span>
              <input type="tel" placeholder={t('cl.phone')} value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><LockIcon /></span>
              <input
                type={showRegPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                placeholder={t('cl.setPin')}
                value={regPin}
                onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
              />
              <button type="button" className="lg-eye-btn" onClick={() => setShowRegPin((v) => !v)} aria-label={t('cl.togglePin')}>
                <EyeIcon off={showRegPin} />
              </button>
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><CalendarIcon /></span>
              <input type="text" inputMode="numeric" placeholder={t('cl.birth')} value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} />
            </div>
            <button className="lg-submit" onClick={submitRegister}>{t('cl.submitRegister')}</button>
          </>
        )}

        <div className="lg-error">{authError}</div>
      </LoginShell>

      {forgotOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setForgotOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" onClick={() => setForgotOpen(false)} aria-label={t('cl.close')}>✕</button>
            <h2>{t('cl.fpTitle')}</h2>
            <p>{t('cl.fpDesc')}</p>
            <input type="tel" placeholder={t('cl.phone')} value={fpPhone} onChange={(e) => setFpPhone(e.target.value)} />
            <input type="text" inputMode="numeric" placeholder={t('cl.fpBirth')} value={fpBirthDate} onChange={(e) => setFpBirthDate(e.target.value)} />
            <input type="password" inputMode="numeric" maxLength={6} placeholder={t('cl.fpNewPin')} value={fpNewPin} onChange={(e) => setFpNewPin(e.target.value.replace(/\D/g, ''))} />
            <input type="password" inputMode="numeric" maxLength={6} placeholder={t('cl.fpConfirmPin')} value={fpNewPinConfirm} onChange={(e) => setFpNewPinConfirm(e.target.value.replace(/\D/g, ''))} />
            <button className="auth-submit" onClick={submitForgotPin}>{t('cl.fpSubmit')}</button>
            <div className="auth-error">{fpError}</div>
            <div className="auth-success">{fpSuccess}</div>
          </div>
        </div>
      )}
    </>
  );
}