import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, saveToken } from '../../api.js';
import LoginShell, {
  PhoneIcon, LockIcon, UserIcon, CalendarIcon, EyeIcon,
} from '../../components/LoginShell.jsx';

export default function CustomerLogin() {
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

  async function submitLogin() {
    setAuthError('');
    if (!loginPhone || !loginPin) {
      setAuthError('ກະລຸນາປ້ອນເບີໂທ ແລະ PIN');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/login', { phone: loginPhone, pin: loginPin });
    if (data.success) {
      saveToken(data.token);
      navigate('/menu');
    } else {
      setAuthError(data.error || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ');
    }
  }

  async function submitRegister() {
    setAuthError('');
    if (!regPhone || !regPin || !regBirthDate) {
      setAuthError('ກະລຸນາປ້ອນເບີໂທ, PIN ແລະ ວັນເດືອນປີເກີດ');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/register', {
      phone: regPhone, pin: regPin, name: regName, birth_date: regBirthDate,
    });
    if (data.success) {
      saveToken(data.token);
      navigate('/menu');
    } else {
      setAuthError(data.error || 'ສະໝັກສະມາຊິກບໍ່ສຳເລັດ');
    }
  }

  async function submitForgotPin() {
    setFpError('');
    setFpSuccess('');
    if (!fpPhone || !fpBirthDate || !fpNewPin || !fpNewPinConfirm) {
      setFpError('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ');
      return;
    }
    if (fpNewPin !== fpNewPinConfirm) {
      setFpError('PIN ໃໝ່ ແລະ ຢືນຢັນ PIN ບໍ່ຕົງກັນ');
      return;
    }
    const res = await fetch('/api/customer-auth/forgot-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fpPhone, birth_date: fpBirthDate, new_pin: fpNewPin }),
    });
    const data = await res.json();
    if (data.success) {
      setFpSuccess(data.message || 'ຕັ້ງ PIN ໃໝ່ສຳເລັດ');
      setTimeout(() => {
        setForgotOpen(false);
        setLoginPhone(fpPhone);
      }, 1500);
    } else {
      setFpError(data.error || 'ຣີເຊັດ PIN ບໍ່ສຳເລັດ');
    }
  }

  const footer =
    tab === 'login' ? (
      <>ຍັງບໍ່ມີບັນຊີ? <button onClick={() => { setTab('register'); setAuthError(''); }}>ສ້າງບັນຊີໃໝ່</button></>
    ) : (
      <>ມີບັນຊີແລ້ວ? <button onClick={() => { setTab('login'); setAuthError(''); }}>ເຂົ້າສູ່ລະບົບ</button></>
    );

  return (
    <>
      <LoginShell
        badge="ສຳລັບລູກຄ້າ"
        subtitle={tab === 'login' ? 'ກະລຸນາເຂົ້າສູ່ລະບົບເພື່ອເຂົ້າໜ້າຮ້ານ' : 'ສະໝັກສະມາຊິກໃໝ່ເພື່ອເລີ່ມຊື້ເຄື່ອງ'}
        footer={footer}
      >
        {tab === 'login' && (
          <>
            <div className="lg-field">
              <span className="lg-field-icon"><PhoneIcon /></span>
              <input type="tel" placeholder="ເບີໂທລະສັບ" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} />
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><LockIcon /></span>
              <input
                type={showLoginPin ? 'text' : 'password'}
                placeholder="ລະຫັດ PIN"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
              />
              <button type="button" className="lg-eye-btn" onClick={() => setShowLoginPin((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງ PIN">
                <EyeIcon off={showLoginPin} />
              </button>
            </div>
            <button className="lg-submit" onClick={submitLogin}>ເຂົ້າສູ່ລະບົບ</button>
            <p className="lg-forgot" onClick={() => setForgotOpen(true)}>ລືມ PIN?</p>
          </>
        )}

        {tab === 'register' && (
          <>
            <div className="lg-field">
              <span className="lg-field-icon"><UserIcon /></span>
              <input type="text" placeholder="ຊື່ (ບໍ່ບັງຄັບ)" value={regName} onChange={(e) => setRegName(e.target.value)} />
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><PhoneIcon /></span>
              <input type="tel" placeholder="ເບີໂທລະສັບ" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><LockIcon /></span>
              <input
                type={showRegPin ? 'text' : 'password'}
                placeholder="ຕັ້ງລະຫັດ PIN (4-6 ໂຕເລກ)"
                value={regPin}
                onChange={(e) => setRegPin(e.target.value)}
              />
              <button type="button" className="lg-eye-btn" onClick={() => setShowRegPin((v) => !v)} aria-label="ສະແດງ/ເຊື່ອງ PIN">
                <EyeIcon off={showRegPin} />
              </button>
            </div>
            <div className="lg-field">
              <span className="lg-field-icon"><CalendarIcon /></span>
              <input type="text" placeholder="ວັນເດືອນປີເກີດ (ໃຊ້ຢືນຢັນຕົວຕົນ)" value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} />
            </div>
            <button className="lg-submit" onClick={submitRegister}>ສະໝັກສະມາຊິກ</button>
          </>
        )}

        <div className="lg-error">{authError}</div>
      </LoginShell>

      {forgotOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setForgotOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" onClick={() => setForgotOpen(false)}>✕</button>
            <h2>ຣີເຊັດລະຫັດ PIN</h2>
            <p>ກະລຸນາປ້ອນເບີໂທ ແລະ ວັນເດືອນປີເກີດທີ່ໃຊ້ຕອນສະໝັກ ເພື່ອຕັ້ງ PIN ໃໝ່</p>
            <input type="tel" placeholder="ເບີໂທລະສັບ" value={fpPhone} onChange={(e) => setFpPhone(e.target.value)} />
            <input type="text" placeholder="ວັນເດືອນປີເກີດ" value={fpBirthDate} onChange={(e) => setFpBirthDate(e.target.value)} />
            <input type="password" placeholder="ຕັ້ງ PIN ໃໝ່ (4-6 ໂຕເລກ)" value={fpNewPin} onChange={(e) => setFpNewPin(e.target.value)} />
            <input type="password" placeholder="ຢືນຢັນ PIN ໃໝ່" value={fpNewPinConfirm} onChange={(e) => setFpNewPinConfirm(e.target.value)} />
            <button className="auth-submit" onClick={submitForgotPin}>ຕັ້ງ PIN ໃໝ່</button>
            <div className="auth-error">{fpError}</div>
            <div className="auth-success">{fpSuccess}</div>
          </div>
        </div>
      )}
    </>
  );
}