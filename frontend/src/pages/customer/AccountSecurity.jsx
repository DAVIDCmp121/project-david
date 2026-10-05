import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { apiGet, apiPost, clearToken } from '../../api';

const BASE = '/api/customer-account';
const digits = (v) => v.replace(/\D/g, '').slice(0, 6);

const css = `
.sc-wrap { max-width: 720px; margin: 0 auto; padding: 20px 16px 32px; }
.sc-head { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
.sc-back {
  background: none; border: none; font-size: 30px; line-height: 1; padding: 0 8px 4px 0;
  cursor: pointer; color: var(--cust-text);
}
.sc-title { font-size: 1.3rem; margin: 0; color: var(--cust-text); }

.sc-card {
  background: #fff; border: 1px solid var(--cust-border); border-radius: 16px;
  padding: 18px; margin-bottom: 14px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.sc-card.danger { border-color: #fca5a5; }
.sc-h { font-size: 1rem; font-weight: 700; margin: 0 0 4px; color: var(--cust-text); }
.sc-card.danger .sc-h { color: #dc2626; }
.sc-sub { font-size: 0.82rem; color: var(--cust-text-muted); margin: 0 0 14px; line-height: 1.5; }
.sc-warn { font-size: 0.82rem; color: #b45309; margin: 0 0 14px; line-height: 1.5; }
.sc-lb { font-size: 0.85rem; color: var(--cust-text-muted); margin-bottom: 4px; }
.sc-input {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px; margin-bottom: 12px;
  border: 1px solid #e5e7eb; background: #fff; font-size: 1rem; color: #1f2937; font-family: inherit;
}
.sc-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px rgba(212, 165, 72, 0.15); }
.sc-btn {
  width: 100%; padding: 13px 10px; border-radius: 12px; border: none; background: var(--gold);
  color: #fff; font-weight: 700; font-size: 0.95rem; cursor: pointer; font-family: inherit;
  box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.sc-btn:disabled { opacity: 0.6; cursor: default; }
.sc-btn.danger { background: #dc2626; box-shadow: none; }
.sc-btn.ghost {
  background: #fff; color: #dc2626; border: 1px solid #dc2626; box-shadow: none;
}
.sc-btn.ghost:hover { background: #dc2626; color: #fff; }
.sc-row { display: flex; gap: 10px; }
.sc-row button { flex: 1; }
.sc-cancel {
  padding: 13px 10px; border-radius: 12px; border: 1px solid var(--cust-border); background: #fff;
  color: var(--cust-text); font-weight: 600; font-size: 0.95rem; cursor: pointer; font-family: inherit;
}
.sc-msg { margin: 0 0 12px; font-size: 0.9rem; }
.sc-msg.ok { color: #16a34a; }
.sc-msg.error { color: #dc2626; }
`;

function Msg({ m }) {
  return m ? <p className={`sc-msg ${m.type}`}>{m.text}</p> : null;
}

function AccountSecurityInner() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  // ປ່ຽນ PIN
  const [curPin, setCurPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [pinMsg, setPinMsg] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);

  // ວັນເກີດ
  const [birthSaved, setBirthSaved] = useState(null);
  const [birth, setBirth] = useState('');
  const [birthPin, setBirthPin] = useState('');
  const [birthMsg, setBirthMsg] = useState(null);
  const [birthBusy, setBirthBusy] = useState(false);

  // ລຶບບັນຊີ
  const [delOpen, setDelOpen] = useState(false);
  const [delPin, setDelPin] = useState('');
  const [delMsg, setDelMsg] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet(`${BASE}/birth-date`);
        if (res.status === 401) {
          navigate('/menu/login');
          return;
        }
        if (res.ok) {
          setBirthSaved(res.data.birth_date || null);
          setBirth(res.data.birth_date || '');
        }
      } catch (err) {
        console.error(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changePin() {
    setPinMsg(null);
    if (curPin.length < 4) return setPinMsg({ type: 'error', text: 'ກະລຸນາປ້ອນ PIN ປັດຈຸບັນ' });
    if (!/^\d{4,6}$/.test(newPin)) return setPinMsg({ type: 'error', text: 'PIN ໃໝ່ຕ້ອງເປັນຕົວເລກ 4-6 ໂຕ' });
    if (newPin !== newPin2) return setPinMsg({ type: 'error', text: 'PIN ໃໝ່ບໍ່ຕົງກັນ' });

    setPinBusy(true);
    try {
      const res = await apiPost(`${BASE}/change-pin`, { current_pin: curPin, new_pin: newPin });
      if (res.ok) {
        setCurPin('');
        setNewPin('');
        setNewPin2('');
        setPinMsg({ type: 'ok', text: 'ປ່ຽນ PIN ສຳເລັດ' });
      } else {
        setPinMsg({ type: 'error', text: (res.data && res.data.error) || 'ປ່ຽນ PIN ບໍ່ສຳເລັດ' });
      }
    } catch (err) {
      console.error(err);
      setPinMsg({ type: 'error', text: 'ປ່ຽນ PIN ບໍ່ສຳເລັດ' });
    }
    setPinBusy(false);
  }

  async function saveBirth() {
    setBirthMsg(null);
    if (!birth) return setBirthMsg({ type: 'error', text: 'ກະລຸນາເລືອກວັນເກີດ' });
    if (birthPin.length < 4) return setBirthMsg({ type: 'error', text: 'ກະລຸນາປ້ອນ PIN ເພື່ອຢືນຢັນ' });

    setBirthBusy(true);
    try {
      const res = await apiPost(`${BASE}/birth-date`, { birth_date: birth, pin: birthPin });
      if (res.ok) {
        setBirthSaved(birth);
        setBirthPin('');
        setBirthMsg({ type: 'ok', text: 'ບັນທຶກວັນເກີດສຳເລັດ' });
      } else {
        setBirthMsg({ type: 'error', text: (res.data && res.data.error) || 'ບັນທຶກບໍ່ສຳເລັດ' });
      }
    } catch (err) {
      console.error(err);
      setBirthMsg({ type: 'error', text: 'ບັນທຶກບໍ່ສຳເລັດ' });
    }
    setBirthBusy(false);
  }

  async function deleteAccount() {
    setDelMsg(null);
    if (delPin.length < 4) return setDelMsg({ type: 'error', text: 'ກະລຸນາປ້ອນ PIN ເພື່ອຢືນຢັນ' });
    if (!window.confirm('ລຶບບັນຊີຖາວອນ? ບໍ່ສາມາດກູ້ຄືນໄດ້')) return;

    setDelBusy(true);
    try {
      const res = await apiPost(`${BASE}/delete`, { pin: delPin });
      if (res.ok) {
        clearToken();
        navigate('/menu/login');
        return;
      }
      setDelMsg({ type: 'error', text: (res.data && res.data.error) || 'ລຶບບັນຊີບໍ່ສຳເລັດ' });
    } catch (err) {
      console.error(err);
      setDelMsg({ type: 'error', text: 'ລຶບບັນຊີບໍ່ສຳເລັດ' });
    }
    setDelBusy(false);
  }

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className="sc-wrap">
        <div className="sc-head">
          <button className="sc-back" onClick={() => navigate('/menu/profile')} aria-label="ກັບຄືນ">
            ‹
          </button>
          <h1 className="sc-title">ຄວາມປອດໄພ</h1>
        </div>

        {/* ປ່ຽນ PIN */}
        <section className="sc-card">
          <h2 className="sc-h">ປ່ຽນ PIN</h2>
          <p className="sc-sub">PIN ໃໝ່ເປັນຕົວເລກ 4-6 ໂຕ</p>

          <div className="sc-lb">PIN ປັດຈຸບັນ</div>
          <input
            className="sc-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={curPin}
            onChange={(e) => setCurPin(digits(e.target.value))}
          />
          <div className="sc-lb">PIN ໃໝ່</div>
          <input
            className="sc-input"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={newPin}
            onChange={(e) => setNewPin(digits(e.target.value))}
          />
          <div className="sc-lb">ຢືນຢັນ PIN ໃໝ່</div>
          <input
            className="sc-input"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={newPin2}
            onChange={(e) => setNewPin2(digits(e.target.value))}
          />
          <Msg m={pinMsg} />
          <button className="sc-btn" onClick={changePin} disabled={pinBusy}>
            {pinBusy ? 'ກຳລັງບັນທຶກ...' : 'ປ່ຽນ PIN'}
          </button>
        </section>

        {/* ວັນເກີດ */}
        <section className="sc-card">
          <h2 className="sc-h">ວັນເດືອນປີເກີດ</h2>
          <p className="sc-sub">ໃຊ້ຢືນຢັນຕົວຕົນເວລາລືມ PIN</p>
          {birthSaved === null && (
            <p className="sc-warn">ຍັງບໍ່ໄດ້ຕັ້ງ — ຖ້າລືມ PIN ຈະຣີເຊັດເອງບໍ່ໄດ້</p>
          )}

          <div className="sc-lb">ວັນເກີດ</div>
          <input
            className="sc-input"
            type="date"
            max={today}
            min="1900-01-01"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
          <div className="sc-lb">ປ້ອນ PIN ເພື່ອຢືນຢັນ</div>
          <input
            className="sc-input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={birthPin}
            onChange={(e) => setBirthPin(digits(e.target.value))}
          />
          <Msg m={birthMsg} />
          <button className="sc-btn" onClick={saveBirth} disabled={birthBusy}>
            {birthBusy ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກວັນເກີດ'}
          </button>
        </section>

        {/* ລຶບບັນຊີ */}
        <section className="sc-card danger">
          <h2 className="sc-h">ລຶບບັນຊີ</h2>
          <p className="sc-sub">
            ຂໍ້ມູນສ່ວນຕົວ, ທີ່ຢູ່, ສິນຄ້າທີ່ຖືກໃຈ, ກະຕ່າ ແລະ ແຊັດ ຈະຖືກລຶບຖາວອນ
            ສ່ວນປະຫວັດອໍເດີຍັງຖືກເກັບໄວ້ໃຫ້ຮ້ານ
          </p>

          {!delOpen ? (
            <button className="sc-btn ghost" onClick={() => setDelOpen(true)}>
              ລຶບບັນຊີຂອງຂ້ອຍ
            </button>
          ) : (
            <>
              <div className="sc-lb">ປ້ອນ PIN ເພື່ອຢືນຢັນ</div>
              <input
                className="sc-input"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={delPin}
                onChange={(e) => setDelPin(digits(e.target.value))}
              />
              <Msg m={delMsg} />
              <div className="sc-row">
                <button
                  className="sc-cancel"
                  onClick={() => {
                    setDelOpen(false);
                    setDelPin('');
                    setDelMsg(null);
                  }}
                >
                  ຍົກເລີກ
                </button>
                <button className="sc-btn danger" onClick={deleteAccount} disabled={delBusy}>
                  {delBusy ? 'ກຳລັງລຶບ...' : 'ຢືນຢັນລຶບບັນຊີ'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AccountSecurity() {
  return (
    <CartProvider>
      <AccountSecurityInner />
    </CartProvider>
  );
}