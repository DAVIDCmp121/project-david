import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../../api.js';

// ➕ ນຳຈາກ public/menu/checkout.html + checkout.js (ເວີຊັນລ່າສຸດ ທີ່ມີ login/register ໃນຕົວ)

const STEP_LABELS = ['ສິນຄ້າ', 'ຂໍ້ມູນ', 'ສະລິບ', 'ຢືນຢັນ'];

export default function Checkout() {
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [step, setStep] = useState(1);

  // step 2 state
  const [phone, setPhone] = useState('');
  const [phoneChecked, setPhoneChecked] = useState(false);
  const [isExisting, setIsExisting] = useState(null);
  const [phoneError, setPhoneError] = useState('');

  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const [regName, setRegName] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regError, setRegError] = useState('');

  const [authDone, setAuthDone] = useState(false);
  const [address, setAddress] = useState('');

  // step 3 state
  const [qrImage, setQrImage] = useState('');
  const [qrMissing, setQrMissing] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [verifying, setVerifying] = useState(false);
  const fileInputRef = useRef(null);

  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('checkoutProduct');
    if (!saved) {
      alert('ບໍ່ພົບຂໍ້ມູນສິນຄ້າ ກະລຸນາເລືອກສິນຄ້າໃໝ່');
      navigate('/menu');
      return;
    }
    setProduct(JSON.parse(saved));

    (async () => {
      const res = await fetch('/api/settings/payment-qr');
      const data = await res.json();
      if (data.qrImage) {
        setQrImage(data.qrImage);
      } else {
        setQrMissing(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!product) return null;

  const total = product.price * qty;

  function changeQty(delta) {
    const next = qty + delta;
    if (next < 1 || next > product.stock) return;
    setQty(next);
  }

  async function checkPhone() {
    setPhoneError('');
    if (!phone) {
      setPhoneError('ກະລຸນາໃສ່ເບີໂທ');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/check-phone', { phone });
    setIsExisting(!!data.exists);
    setPhoneChecked(true);
  }

  async function submitLoginStep() {
    setLoginError('');
    if (!loginPin) {
      setLoginError('ກະລຸນາໃສ່ PIN');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/login', { phone, pin: loginPin });
    if (data.success) {
      setAuthDone(true);
    } else {
      setLoginError(data.error || 'PIN ບໍ່ຖືກຕ້ອງ');
    }
  }

  async function submitRegisterStep() {
    setRegError('');
    if (!regPin || !regPinConfirm || !regBirthDate) {
      setRegError('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບ');
      return;
    }
    if (regPin !== regPinConfirm) {
      setRegError('PIN ແລະ ຢືນຢັນ PIN ບໍ່ຕົງກັນ');
      return;
    }
    const { data } = await apiPost('/api/customer-auth/register', {
      phone, pin: regPin, name: regName, birth_date: regBirthDate,
    });
    if (data.success) {
      setAuthDone(true);
    } else {
      setRegError(data.error || 'ສະໝັກສະມາຊິກບໍ່ສຳເລັດ');
    }
  }

  function validateStep2() {
    if (!address.trim()) {
      alert('ກະລຸນາໃສ່ທີ່ຢູ່ຈັດສົ່ງ');
      return;
    }
    setStep(3);
  }

  function onSlipChange(e) {
    const file = e.target.files[0];
    setSlipFile(file || null);
    if (file) setSlipPreview(URL.createObjectURL(file));
  }

  async function validateStep3() {
    if (!slipFile) {
      alert('ກະລນາອັບໂຫລດຮູບສະລິບໂອນເງິນກ່ອນ');
      return;
    }
    setVerifying(true);
    try {
      const formData = new FormData();
      formData.append('slip', slipFile);
      formData.append('product_id', product.id);
      formData.append('quantity', qty);

      const res = await fetch('/api/orders/verify-slip', { method: 'POST', body: formData });
      const data = await res.json();

      if (!data.valid) {
        alert(data.reason || 'ຮູບທີ່ອັບໂຫລດບໍ່ຖືກຕ້ອງ ກະລຸນາກວດສອບແລ້ວລອງໃໝ່');
        return;
      }
      setStep(4);
    } catch (err) {
      alert('ກວດສອບຮູບບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
    } finally {
      setVerifying(false);
    }
  }

  async function submitOrder() {
    setConfirming(true);
    try {
      const formData = new FormData();
      formData.append('product_id', product.id);
      formData.append('quantity', qty);
      formData.append('customer_phone', phone);
      formData.append('customer_address', address);
      formData.append('slip', slipFile);

      const res = await fetch('/api/orders', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();

      if (res.ok) {
        sessionStorage.removeItem('checkoutProduct');

        const orderMessage =
          `ສັ່ງຊື້ໃໝ່:\n` +
          `ສິນຄ້າ: ${product.name}\n` +
          `ຈຳນວນ: ${qty}\n` +
          `ລວມ: ${total} ກີບ\n` +
          `ທີ່ຢູ່ຈັດສົ່ງ: ${address}`;

        try {
          await apiPost('/api/messages', { message_text: orderMessage });
          const slipFormData = new FormData();
          slipFormData.append('image', slipFile);
          await fetch('/api/messages/upload', { method: 'POST', credentials: 'include', body: slipFormData });
        } catch (msgErr) {
          console.error('ສົ່ງຂໍ້ຄວາມ/ຮູບເຂົ້າແຊັດບໍ່ສຳເລັດ:', msgErr);
        }

        navigate('/menu/chat');
      } else {
        alert('ເກີດຂໍ້ຜິດພາດ: ' + data.error);
        setConfirming(false);
      }
    } catch (err) {
      alert('ເຊື່ອມຕໍ່ບໍ່ໄດ້ ກະລຸນາລອງໃໝ່');
      setConfirming(false);
    }
  }

  return (
    <div className="customer-shell">
      <div className="checkout-page">
        <div className="steps-bar">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`step ${step === i + 1 ? 'active' : ''}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="step-panel">
            <h2>ສິນຄ້າທີ່ເລືອກ</h2>
            <div className="summary-product">
              {product.image && <img src={product.image} alt={product.name} />}
              <div>
                <h3>{product.name}</h3>
                <p>{product.price} ກີບ / ອັນ</p>
              </div>
            </div>
            <div className="qty-control">
              <span>ຈຳນວນ:</span>
              <button onClick={() => changeQty(-1)}>−</button>
              <span>{qty}</span>
              <button onClick={() => changeQty(1)}>+</button>
            </div>
            <div className="checkout-total">
              <span>ລວມທັງໝົດ</span>
              <span>{total} ກີບ</span>
            </div>
            <button className="next-btn" onClick={() => setStep(2)}>ຕໍ່ໄປ</button>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel">
            <h2>ຂໍ້ມູນລູກຄ້າ</h2>

            {!phoneChecked && (
              <div>
                <input type="tel" placeholder="ເບີໂທຕິດຕໍ່" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <button className="next-btn" onClick={checkPhone}>ກວດສອບເບີໂທ</button>
                <div className="field-error">{phoneError}</div>
              </div>
            )}

            {phoneChecked && !authDone && isExisting && (
              <div>
                <p>ຍິນດີຕ້ອນຮັບກັບມາ ກະລຸນາໃສ່ PIN</p>
                <input type="password" placeholder="ລະຫັດ PIN" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} />
                <button className="next-btn" onClick={submitLoginStep}>ເຂົ້າສູ່ລະບົບ</button>
                <div className="field-error">{loginError}</div>
              </div>
            )}

            {phoneChecked && !authDone && isExisting === false && (
              <div>
                <p>ຍັງບໍ່ເຄີຍສະໝັກ ກະລຸນາຕັ້ງບັນຊີໃໝ່</p>
                <input type="text" placeholder="ຊື່ (ບໍ່ບັງຄັບ)" value={regName} onChange={(e) => setRegName(e.target.value)} />
                <input type="password" placeholder="ຕັ້ງລະຫັດ PIN (4-6 ໂຕເລກ)" value={regPin} onChange={(e) => setRegPin(e.target.value)} />
                <input type="password" placeholder="ຢືນຢັນ PIN" value={regPinConfirm} onChange={(e) => setRegPinConfirm(e.target.value)} />
                <input type="text" placeholder="ວັນເດືອນປີເກີດ (ໃຊ້ຢືນຢັນຕົວຕົນ)" value={regBirthDate} onChange={(e) => setRegBirthDate(e.target.value)} />
                <button className="next-btn" onClick={submitRegisterStep}>ສະໝັກສະມາຊິກ</button>
                <div className="field-error">{regError}</div>
              </div>
            )}

            {authDone && (
              <div>
                <p>ເຂົ້າສູ່ລະບົບແລ້ວ: <b>{phone}</b></p>
                <textarea placeholder="ທີ່ຢູ່ຈັດສົ່ງ" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
                <div className="btn-row">
                  <button className="back-btn" onClick={() => setStep(1)}>ກັບຄືນ</button>
                  <button className="next-btn" onClick={validateStep2}>ຕໍ່ໄປ</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="step-panel">
            <h2>ສະແກນຈ່າຍເງິນ</h2>
            {qrImage && <img src={qrImage} alt="QR ຮັບເງິນ" className="payment-qr" />}
            {qrMissing && <p>ຮ້ານຍັງບໍ່ໄດ້ຕັ້ງ QR ຮັບເງິນ ກະລຸນາຕິດຕໍ່ຮ້ານ</p>}
            <div className="pay-amount-box">
              <span>ຍອດທີ່ຕ້ອງໂອນ</span>
              <span>{total} ກີບ</span>
            </div>
            <label className="upload-label">ອັບໂຫລດຮູບສະລິບໂອນເງິນ</label>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={onSlipChange} />
            {slipPreview && <img src={slipPreview} className="slip-preview" alt="slip preview" />}
            <div className="btn-row">
              <button className="back-btn" onClick={() => setStep(2)}>ກັບຄືນ</button>
              <button className="next-btn" onClick={validateStep3} disabled={verifying}>
                {verifying ? 'ກຳລັງກວດສອບ...' : 'ຕໍ່ໄປ'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-panel">
            <h2>ກວດສອບຂໍ້ມູນກ່ອນຢືນຢັນ</h2>
            <div className="final-summary">
              <p><b>ສິນຄ້າ:</b> {product.name}</p>
              <p><b>ຈຳນວນ:</b> {qty}</p>
              <p><b>ລວມ:</b> {total} ກີບ</p>
              <p><b>ເບີໂທ:</b> {phone}</p>
              <p><b>ທີ່ຢູ່:</b> {address}</p>
            </div>
            <div className="btn-row">
              <button className="back-btn" onClick={() => setStep(3)}>ກັບຄືນ</button>
              <button className="confirm-btn" onClick={submitOrder} disabled={confirming}>
                {confirming ? 'ກຳລັງສົ່ງ...' : 'ຢືນຢັນການສັ່ງຊື້'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
