import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, apiGet, apiPost, apiUpload } from '../../api.js';

const STEP_LABELS = ['ກະຕ່າ ແລະ ທີ່ຢູ່', 'ຊຳລະເງິນ'];

export default function Checkout() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState(1);

  const [qrImage, setQrImage] = useState('');
  const [qrMissing, setQrMissing] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    (async () => {
      const [cartRes, meRes, qrRes] = await Promise.all([
        apiGet('/api/cart'),
        apiGet('/api/customer-auth/me'),
        apiGet('/api/settings/payment-qr'),
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

      if (meRes.ok) setPhone(meRes.data.phone || '');

      if (qrRes.ok && qrRes.data.qrImage) {
        setQrImage(qrRes.data.qrImage);
      } else {
        setQrMissing(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items && !loadError) {
    return <div className="customer-shell"><p style={{ padding: 20, color: '#ccc' }}>ກຳລັງໂຫລດ...</p></div>;
  }
  if (loadError) {
    return (
      <div className="customer-shell">
        <div style={{ padding: 20, color: '#ccc' }}>
          <p>ໂຫລດຂໍ້ມູນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່</p>
          <button onClick={() => navigate('/menu/cart')}>ກັບໄປກະຕ່າ</button>
        </div>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  function validateStep1() {
    if (!address.trim()) {
      alert('ກະລຸນາໃສ່ທີ່ຢູ່ຈັດສົ່ງ');
      return;
    }
    setStep(2);
  }

  function onSlipChange(e) {
    const file = e.target.files[0];
    setSlipFile(file || null);
    if (file) setSlipPreview(URL.createObjectURL(file));
  }

  async function submitOrder() {
    if (!slipFile) {
      alert('ກະລຸນາອັບໂຫລດຮູບສະລິບໂອນເງິນກ່ອນ');
      return;
    }
    setConfirming(true);
    try {
      const formData = new FormData();
      formData.append('customer_phone', phone);
      formData.append('customer_address', address);
      formData.append('slip', slipFile);

      const { ok, data } = await apiUpload('/api/orders', formData);

      if (ok) {
        const itemLines = items.map((i) => `- ${i.name} x${i.quantity} = ${i.price * i.quantity} ກີບ`).join('\n');
        const orderMessage =
          `ສັ່ງຊື້ໃໝ່:\n${itemLines}\nລວມ: ${total} ກີບ\nທີ່ຢູ່ຈັດສົ່ງ: ${address}`;

        try {
          await apiPost('/api/messages', { message_text: orderMessage });
          const slipFormData = new FormData();
          slipFormData.append('image', slipFile);
          await apiUpload('/api/messages/upload', slipFormData);
        } catch (msgErr) {
          console.error('ສົ່ງຂໍ້ຄວາມ/ຮູບເຂົ້າແຊັດບໍ່ສຳເລັດ:', msgErr);
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
            <h2>ລາຍການສິນຄ້າ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {item.image && (
                    <img src={`${API_BASE}${item.image}`} alt={item.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div>{item.name}</div>
                    <div style={{ color: '#999', fontSize: 13 }}>x{item.quantity}</div>
                  </div>
                  <div>{item.price * item.quantity} ກີບ</div>
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <span>ລວມທັງໝົດ</span>
              <span>{total} ກີບ</span>
            </div>

            <p style={{ marginTop: 16 }}>ເບີໂທ: <b>{phone}</b></p>
            <textarea placeholder="ທີ່ຢູ່ຈັດສົ່ງ" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />

            <div className="btn-row">
              <button className="back-btn" onClick={() => navigate('/menu/cart')}>ກັບຄືນ</button>
              <button className="next-btn" onClick={validateStep1}>ຕໍ່ໄປ</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel">
            <h2>ສະແກນຈ່າຍເງິນ</h2>
            {qrImage && <img src={qrImage} alt="QR ຮັບເງິນ" className="payment-qr" />}
            {qrMissing && <p>ຮ້ານຍັງບໍ່ໄດ້ຕັ້ງ QR ຮັບເງິນ ກະລຸນາຕິດຕໍ່ຮ້ານ</p>}
            <div className="pay-amount-box">
              <span>ຍອດທີ່ຕ້ອງໂອນ</span>
              <span>{total} ກີບ</span>
            </div>
            <label className="upload-label">ອັບໂຫລດຮູບສະລິບໂອນເງິນ</label>
            <input type="file" accept="image/*" onChange={onSlipChange} />
            {slipPreview && <img src={slipPreview} className="slip-preview" alt="slip preview" />}
            <div className="btn-row">
              <button className="back-btn" onClick={() => setStep(1)}>ກັບຄືນ</button>
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