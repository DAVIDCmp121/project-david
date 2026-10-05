import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiUpload } from '../../api.js';

const STEP_LABELS = ['ເລືອກຂົນສົ່ງ', 'ຂໍ້ມູນ ແລະ ຊຳລະເງິນ'];
const MAX_SAVED_ADDRESSES = 5;

// key ຕ້ອງກົງກັບ VALID_CARRIERS ໃນ backend/routes/orders.js
// ໂລໂກ້ຢູ່ frontend/public/carriers/<key>.png (ຖ້າບໍ່ມີ ຈະສະແດງຕົວອັກສອນແທນ)
const CARRIERS = [
  { key: 'anousith', name: 'Anousith Express', color: '#c62828' },
  { key: 'hal', name: 'HAL Express', color: '#d32f2f' },
  { key: 'mixay', name: 'Mixay Express', color: '#b71c1c' },
];

const ic = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const IconTransfer = () => (
  <svg {...ic}>
    <path d="M7 7h13l-3-3M17 17H4l3 3" />
  </svg>
);

const IconCash = ({ size = 20 }) => (
  <svg {...ic} width={size} height={size}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const css = `
.checkout-page.co-wide { max-width: 980px; }

.co-sec-title { font-size: 1rem; font-weight: 700; margin: 20px 0 10px; color: var(--cust-text); }

/* ---------- ໜ້າ 1: ເລືອກຂົນສົ່ງ ---------- */
.co-carriers { display: flex; flex-direction: column; gap: 10px; }
.co-carrier {
  display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px;
  border: 1.5px solid var(--cust-border); border-radius: 14px; background: #fff;
  cursor: pointer; text-align: left; font-family: inherit;
}
.co-carrier:hover { border-color: var(--gold); }
.co-carrier.selected {
  border-color: var(--gold); background: #fffaf0; box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15);
}
.co-logo { object-fit: cover; flex: 0 0 auto; background: #f4f4f2; }
.co-logo-fallback {
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
  color: #fff; font-weight: 800;
}
.co-carrier-name { flex: 1; font-size: 1rem; font-weight: 600; color: var(--cust-text); }
.co-radio {
  width: 22px; height: 22px; border-radius: 50%; border: 2px solid #d1d5db; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
}
.co-carrier.selected .co-radio { border-color: var(--gold); }
.co-carrier.selected .co-radio::after {
  content: ''; width: 12px; height: 12px; border-radius: 50%; background: var(--gold);
}

/* ---------- ການ໌ດທົ່ວໄປ ---------- */
.co-card {
  background: #fff; border: 1px solid var(--cust-border); border-radius: 16px; padding: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.co-summary { display: flex; align-items: center; gap: 12px; }
.co-summary-name { flex: 1; font-weight: 600; color: var(--cust-text); }
.co-change {
  padding: 6px 14px; border-radius: 999px; border: 1px solid var(--gold); background: #fff;
  color: #b8862b; font-weight: 700; font-size: 0.8rem; cursor: pointer; font-family: inherit;
}
.co-change:hover { background: var(--gold); color: #fff; }
.co-label { font-size: 0.85rem; color: var(--cust-text-muted); margin-bottom: 4px; }
.co-name { font-weight: 700; font-size: 1.05rem; color: var(--cust-text); margin-bottom: 14px; }
.co-name.empty { font-weight: 500; font-size: 0.9rem; color: var(--cust-text-muted); }

/* ທີ່ຢູ່ທີ່ບັນທຶກໄວ້ */
.co-addr-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.co-addr-chip {
  padding: 6px 12px; border-radius: 999px; border: 1px solid var(--cust-border); background: #fff;
  font-size: 0.82rem; color: var(--cust-text); cursor: pointer; font-family: inherit;
}
.co-addr-chip:hover { border-color: var(--gold); }
.co-addr-chip.selected { border-color: var(--gold); background: #fffaf0; color: #b8862b; font-weight: 700; }
.co-save-addr {
  display: flex; align-items: center; gap: 8px; margin-top: 10px;
  font-size: 0.85rem; color: var(--cust-text-muted); cursor: pointer;
}

/* ---------- ໜ້າ 2: ສອງຝັ່ງ ---------- */
.co-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px; align-items: start;
}
.co-col h2 { margin: 0 0 14px; font-size: 1.5em; }
.co-stack { display: flex; flex-direction: column; gap: 12px; }

/* ປຸ່ມເລືອກວິທີຊຳລະ */
.co-pay { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.co-pay-opt {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 8px; border: 1.5px solid var(--cust-border); border-radius: 12px; background: #fff;
  font-weight: 600; font-size: 0.92rem; color: var(--cust-text); cursor: pointer; font-family: inherit;
}
.co-pay-opt:hover { border-color: var(--gold); }
.co-pay-opt.selected {
  border-color: var(--gold); background: #fffaf0; color: #b8862b;
  box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15);
}

/* QR */
.co-qr-wrap { display: flex; justify-content: center; margin-bottom: 12px; }
.co-qr-wrap .payment-qr { max-width: 210px; width: 100%; margin: 0; }
.co-card .pay-amount-box {
  background: #fffaf0; border: 1px solid #f1e3b8; margin-bottom: 14px;
}
.co-card .pay-amount-box span:last-child { color: #b8862b; font-size: 1.1rem; }

/* ອັບໂຫລດສະລິບ */
.co-upload {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
  padding: 12px; border: 1.5px dashed #d8c68a; border-radius: 12px; background: #fffdf6;
  color: #b8862b; font-weight: 700; font-size: 0.92rem; cursor: pointer;
}
.co-upload:hover { background: #fffaf0; border-color: var(--gold); }
.co-upload input { display: none; }
.co-slip-row {
  display: flex; align-items: center; gap: 12px; padding: 8px 10px;
  border: 1px solid var(--cust-border); border-radius: 12px; background: #fff;
}
.co-slip-thumb {
  width: 56px; height: 56px; object-fit: cover; border-radius: 8px; display: block;
  border: 1px solid #eee;
}
.co-slip-name {
  flex: 1; min-width: 0; font-size: 0.85rem; color: var(--cust-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.co-slip-remove {
  padding: 6px 12px; border-radius: 999px; border: 1px solid #fca5a5; background: #fff;
  color: #dc2626; font-weight: 700; font-size: 0.8rem; cursor: pointer; font-family: inherit;
}
.co-slip-remove:hover { background: #dc2626; border-color: #dc2626; color: #fff; }

/* COD */
.co-cod { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; color: var(--cust-text); }
.co-cod-ic {
  width: 44px; height: 44px; border-radius: 12px; background: #faf6ea; color: #b8862b;
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
}

/* ແຖບຢືນຢັນຕິດຂອບລຸ່ມຈໍ */
.co-bar {
  position: sticky; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 40;
  margin-top: 22px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  background: #fff; border: 1px solid var(--cust-border); border-radius: 16px; padding: 12px 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.co-bar-label { display: block; font-size: 0.78rem; color: var(--cust-text-muted); }
.co-bar-amount { font-size: 1.2rem; font-weight: 800; color: #b8862b; }
.co-bar-actions { display: flex; gap: 10px; }
.co-bar-back {
  padding: 12px 20px; border-radius: 10px; border: 1px solid var(--cust-border); background: #fff;
  color: var(--cust-text); font-weight: 600; font-family: inherit; cursor: pointer;
}
.co-bar-confirm {
  padding: 12px 24px; border-radius: 10px; border: none; background: var(--gold); color: #fff;
  font-weight: 800; font-family: inherit; cursor: pointer;
  box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.co-bar-confirm:hover:not(:disabled) { filter: brightness(1.06); }
.co-bar-confirm:disabled { opacity: 0.6; cursor: default; }

@media (max-width: 800px) {
  .co-grid { grid-template-columns: minmax(0, 1fr); gap: 22px; }
}
@media (max-width: 520px) {
  .co-bar { flex-direction: column; align-items: stretch; gap: 10px; }
  .co-bar-total { display: flex; justify-content: space-between; align-items: baseline; }
  .co-bar-actions button { flex: 1; }
}
`;

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function CarrierLogo({ carrier, size = 52 }) {
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.23);

  if (failed) {
    return (
      <span
        className="co-logo-fallback"
        style={{ width: size, height: size, borderRadius: radius, background: carrier.color, fontSize: size * 0.42 }}
      >
        {carrier.name[0]}
      </span>
    );
  }
  return (
    <img
      className="co-logo"
      style={{ width: size, height: size, borderRadius: radius }}
      src={`/carriers/${carrier.key}.png`}
      alt={carrier.name}
      onError={() => setFailed(true)}
    />
  );
}

function CheckoutInner() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [carrier, setCarrier] = useState('');
  const [payMethod, setPayMethod] = useState('transfer'); // 'transfer' | 'cod'
  const [step, setStep] = useState(1);

  const [savedAddrs, setSavedAddrs] = useState([]);
  const [saveAddr, setSaveAddr] = useState(true);

  const [qrImage, setQrImage] = useState('');
  const [qrMissing, setQrMissing] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const [cartRes, meRes, qrRes, addrRes] = await Promise.all([
        apiGet('/api/cart'),
        apiGet('/api/customer-auth/me'),
        apiGet('/api/settings/payment-qr'),
        apiGet('/api/customer-account/addresses'),
      ]);

      if (cartRes.ok && Array.isArray(cartRes.data.items)) {
        if (cartRes.data.items.length === 0) {
          alert('ກະຕ່າສິນຄ້າວ່າງເປົ່າ ກະລຸນາເລືອກສິນຄ້າກ່ອນ');
          navigate('/menu');
          return;
        }
        setItems(cartRes.data.items);
      } else {
        setLoadError(true);
      }

      if (meRes.ok) {
        setPhone(meRes.data.phone || '');
        setName(meRes.data.name || '');
      }

      if (addrRes.ok && Array.isArray(addrRes.data.addresses)) {
        setSavedAddrs(addrRes.data.addresses);
        const def = addrRes.data.addresses.find((a) => a.is_default) || addrRes.data.addresses[0];
        if (def) setAddress(def.address);
      }

      if (qrRes.ok && qrRes.data.qrImage) {
        setQrImage(qrRes.data.qrImage);
      } else {
        setQrMissing(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items && !loadError) {
    return (
      <div className="customer-shell">
        <TopBar />
        <p style={{ padding: 20, color: 'var(--cust-text-muted)' }}>ກຳລັງໂຫລດ...</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="customer-shell">
        <TopBar />
        <div style={{ padding: 20, color: 'var(--cust-text-muted)' }}>
          <p>ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່</p>
          <button onClick={() => navigate('/menu/cart')}>ກັບໄປກະຕ່າ</button>
        </div>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const carrierObj = CARRIERS.find((c) => c.key === carrier);
  const addressIsNew =
    address.trim() !== '' && !savedAddrs.some((a) => a.address.trim() === address.trim());

  function goStep(n) {
    setStep(n);
    window.scrollTo(0, 0);
  }

  function validateStep1() {
    if (!carrier) {
      alert('ກະລຸນາເລືອກຂົນສົ່ງ');
      return;
    }
    goStep(2);
  }

  function onSlipChange(e) {
    const file = e.target.files[0];
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipFile(file || null);
    setSlipPreview(file ? URL.createObjectURL(file) : '');
  }

  function removeSlip() {
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipFile(null);
    setSlipPreview('');
  }

  async function submitOrder() {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      alert('ກະລຸນາໃສ່ເບີໂທໃຫ້ຖືກຕ້ອງ');
      return;
    }
    if (!address.trim()) {
      alert('ກະລຸນາໃສ່ທີ່ຢູ່ຈັດສົ່ງ');
      return;
    }
    if (payMethod === 'transfer' && !slipFile) {
      alert('ກະລຸນາອັບໂຫລດຮູບສະລິບໂອນເງິນກ່ອນ');
      return;
    }

    setConfirming(true);
    try {
      const formData = new FormData();
      formData.append('customer_phone', cleanPhone);
      formData.append('customer_address', address.trim());
      formData.append('carrier', carrier);
      formData.append('payment_method', payMethod);
      if (payMethod === 'transfer') formData.append('slip', slipFile);

      const { ok, data } = await apiUpload('/api/orders', formData);

      if (ok) {
        const itemLines = items
          .map((i) => `- ${i.name}${i.chosen_size ? ` (ໄຊສ໌ ${i.chosen_size})` : ''} x${i.quantity} = ${i.price * i.quantity} ກີບ`)
          .join('\n');
        const methodText = payMethod === 'cod' ? 'ເກັບເງິນປາຍທາງ (COD)' : 'ໂອນເງິນ';
        const orderMessage =
          `ສັ່ງຊື້ໃໝ່:\n${itemLines}\nລວມ: ${total} ກີບ\n` +
          `ຂົນສົ່ງ: ${carrierObj.name}\nວິທີຊຳລະ: ${methodText}\n` +
          `ເບີໂທ: ${cleanPhone}\nທີ່ຢູ່ຈັດສົ່ງ: ${address.trim()}`;

        try {
          await apiPost('/api/messages', { message_text: orderMessage });
          if (payMethod === 'transfer') {
            const slipFormData = new FormData();
            slipFormData.append('image', slipFile);
            await apiUpload('/api/messages/upload', slipFormData);
          }
        } catch (msgErr) {
          console.error('ສົ່ງຂໍ້ຄວາມ/ຮູບເຂົ້າແຊັດບໍ່ສຳເລັດ:', msgErr);
        }

        // ບັນທຶກທີ່ຢູ່ໃໝ່ໄວ້ໃຊ້ຄັ້ງຕໍ່ໄປ (ຖ້າລູກຄ້າຕິກເລືອກ ແລະ ຍັງບໍ່ເຕັມ 5 ທີ່ຢູ່)
        if (saveAddr && addressIsNew && savedAddrs.length < MAX_SAVED_ADDRESSES) {
          try {
            await apiPost('/api/customer-account/addresses', { label: '', address: address.trim() });
          } catch (addrErr) {
            console.error('ບັນທຶກທີ່ຢູ່ບໍ່ສຳເລັດ:', addrErr);
          }
        }

        navigate('/menu/chat');
      } else {
        alert('ເກີດຂໍ້ຜິດພາດ: ' + (data.error || ''));
        setConfirming(false);
      }
    } catch (err) {
      alert('ເຊື່ອມຕໍ່ບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
      setConfirming(false);
    }
  }

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className={`checkout-page${step === 2 ? ' co-wide' : ''}`}>
        <div className="steps-bar">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`step ${step === i + 1 ? 'active' : ''}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="step-panel">
            <h2>ລາຍການສິນຄ້າ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {item.image && (
                    <img src={`${API_BASE}${item.image}`} alt={item.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div>{item.name}</div>
                    <div style={{ color: '#999', fontSize: 13 }}>
                      {item.chosen_size ? `ໄຊສ໌ ${item.chosen_size} · ` : ''}x{item.quantity}
                    </div>
                  </div>
                  <div>{fmt(item.price * item.quantity)} ກີບ</div>
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <span>ລວມທັງໝົດ</span>
              <span>{fmt(total)} ກີບ</span>
            </div>

            <div className="co-sec-title">ເລືອກຂົນສົ່ງ</div>
            <div className="co-carriers">
              {CARRIERS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`co-carrier${carrier === c.key ? ' selected' : ''}`}
                  onClick={() => setCarrier(c.key)}
                >
                  <CarrierLogo carrier={c} />
                  <span className="co-carrier-name">{c.name}</span>
                  <span className="co-radio" />
                </button>
              ))}
            </div>

            <div className="btn-row">
              <button className="back-btn" onClick={() => navigate('/menu/cart')}>ກັບຄືນ</button>
              <button className="next-btn" onClick={validateStep1}>ຕໍ່ໄປ</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel">
            <div className="co-grid">
              {/* ===== ຝັ່ງຊ້າຍ: ຂໍ້ມູນ ===== */}
              <div className="co-col">
                <h2>ຂໍ້ມູນ</h2>
                <div className="co-stack">
                  <div className="co-card co-summary">
                    <CarrierLogo carrier={carrierObj} size={44} />
                    <div className="co-summary-name">{carrierObj.name}</div>
                    <button type="button" className="co-change" onClick={() => goStep(1)}>ປ່ຽນ</button>
                  </div>

                  <div className="co-card">
                    <div className="co-label">ຊື່</div>
                    <div className={`co-name${name ? '' : ' empty'}`}>
                      {name || 'ຍັງບໍ່ໄດ້ຕັ້ງຊື່ (ຕັ້ງໄດ້ທີ່ໜ້າຂໍ້ມູນສ່ວນຕົວ)'}
                    </div>

                    <div className="co-label">ເບີໂທ</div>
                    <input
                      type="tel"
                      value={phone}
                      maxLength={16}
                      onChange={(e) => setPhone(e.target.value)}
                    />

                    <div className="co-label">ທີ່ຢູ່ຈັດສົ່ງ</div>
                    {savedAddrs.length > 0 && (
                      <div className="co-addr-chips">
                        {savedAddrs.map((a) => (
                          <button
                            type="button"
                            key={a.id}
                            className={`co-addr-chip${address === a.address ? ' selected' : ''}`}
                            onClick={() => setAddress(a.address)}
                          >
                            {a.label || a.address.slice(0, 18)}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      placeholder="ທີ່ຢູ່ຈັດສົ່ງ"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      style={{ marginBottom: 0 }}
                    />
                    {addressIsNew && savedAddrs.length < MAX_SAVED_ADDRESSES && (
                      <label className="co-save-addr">
                        <input
                          type="checkbox"
                          checked={saveAddr}
                          onChange={(e) => setSaveAddr(e.target.checked)}
                        />
                        ບັນທຶກທີ່ຢູ່ນີ້ໄວ້ໃຊ້ຄັ້ງຕໍ່ໄປ
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== ຝັ່ງຂວາ: ຊຳລະເງິນ ===== */}
              <div className="co-col">
                <h2>ຊຳລະເງິນ</h2>

                <div className="co-pay">
                  <button
                    type="button"
                    className={`co-pay-opt${payMethod === 'transfer' ? ' selected' : ''}`}
                    onClick={() => setPayMethod('transfer')}
                  >
                    <IconTransfer /> ໂອນເງິນ
                  </button>
                  <button
                    type="button"
                    className={`co-pay-opt${payMethod === 'cod' ? ' selected' : ''}`}
                    onClick={() => setPayMethod('cod')}
                  >
                    <IconCash /> ເກັບເງິນປາຍທາງ (COD)
                  </button>
                </div>

                <div className="co-card">
                  {payMethod === 'transfer' ? (
                    <>
                      {qrImage && (
                        <div className="co-qr-wrap">
                          <img src={qrImage} alt="QR ຮັບເງິນ" className="payment-qr" />
                        </div>
                      )}
                      {qrMissing && <p>ຮ້ານຍັງບໍ່ໄດ້ຕັ້ງ QR ຮັບເງິນ ກະລຸນາຕິດຕໍ່ຮ້ານ ຫຼື ເລືອກເກັບເງິນປາຍທາງ</p>}
                      <div className="pay-amount-box">
                        <span>ຍອດທີ່ຕ້ອງໂອນ</span>
                        <span>{fmt(total)} ກີບ</span>
                      </div>

                      <label className="upload-label">ອັບໂຫລດຮູບສະລິບໂອນເງິນ</label>
                      {slipFile ? (
                        <div className="co-slip-row">
                          <a href={slipPreview} target="_blank" rel="noreferrer" title="ກົດເພື່ອເບິ່ງຮູບໃຫຍ່">
                            <img src={slipPreview} alt="slip" className="co-slip-thumb" />
                          </a>
                          <div className="co-slip-name">{slipFile.name}</div>
                          <button type="button" className="co-slip-remove" onClick={removeSlip}>ລຶບ</button>
                        </div>
                      ) : (
                        <label className="co-upload">
                          <input type="file" accept="image/*" onChange={onSlipChange} />
                          <span>+ ເລືອກຮູບສະລິບໂອນເງິນ</span>
                        </label>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="co-cod">
                        <span className="co-cod-ic"><IconCash size={24} /></span>
                        <span>ຈ່າຍເງິນສົດເມື່ອໄດ້ຮັບສິນຄ້າ</span>
                      </div>
                      <div className="pay-amount-box" style={{ marginBottom: 0 }}>
                        <span>ຍອດທີ່ຕ້ອງຈ່າຍ</span>
                        <span>{fmt(total)} ກີບ</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ===== ແຖບຢືນຢັນ (ຕິດຂອບລຸ່ມຈໍ) ===== */}
            <div className="co-bar">
              <div className="co-bar-total">
                <span className="co-bar-label">ລວມທັງໝົດ</span>
                <span className="co-bar-amount">{fmt(total)} ກີບ</span>
              </div>
              <div className="co-bar-actions">
                <button type="button" className="co-bar-back" onClick={() => goStep(1)}>ກັບຄືນ</button>
                <button type="button" className="co-bar-confirm" onClick={submitOrder} disabled={confirming}>
                  {confirming ? 'ກຳລັງສົ່ງ...' : 'ຢືນຢັນການສັ່ງຊື້'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <CartProvider>
      <CheckoutInner />
    </CartProvider>
  );
}