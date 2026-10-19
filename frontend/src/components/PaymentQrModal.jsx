import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { getAuthHeader } from '../api.js';
import ConfirmModal from './ConfirmModal.jsx';
import { usePageT } from '../useT.js';
import { canBuildDynamic } from '../laoqr.js';

const MAX_BANKS = 6;

const dict = {
  lo: {
    'qr.title': 'ຮູບ QR ຮັບເງິນຮ້ານ',
    'qr.hint': 'ເພີ່ມ QR ໄດ້ຫຼາຍທະນາຄານ (ສູງສຸດ 6) ລູກຄ້າຈະເລືອກທະນາຄານກ່ອນ ແລ້ວຈຶ່ງເຫັນ QR',
    'qr.empty': 'ຍັງບໍ່ໄດ້ເພີ່ມທະນາຄານ — ລະບົບຍັງໃຊ້ QR ເດີມຢູ່. ເມື່ອເພີ່ມທະນາຄານແລ້ວ QR ເດີມຈະບໍ່ຖືກໃຊ້ອີກ ຢ່າລືມເພີ່ມທະນາຄານເດີມເຂົ້າລາຍການດ້ວຍ',
    'qr.auto': '✓ ຝັງຍອດອັດຕະໂນມັດ',
    'qr.static': 'ຮູບທົ່ວໄປ (ລູກຄ້າໃສ່ຍອດເອງ)',
    'qr.delete': 'ລຶບ',
    'qr.confirmDelete': 'ລຶບທະນາຄານນີ້ອອກ?',
    'qr.addTitle': 'ເພີ່ມທະນາຄານ',
    'qr.bankName': 'ຊື່ທະນາຄານ (ເຊັ່ນ BCEL, LDB, JDB)',
    'qr.logo': 'ໂລໂກ້',
    'qr.logoHint': 'ໂລໂກ້ທະນາຄານ (ບໍ່ບັງຄັບ)',
    'qr.logoRemove': 'ເອົາອອກ',
    'qr.qrLabel': 'ຮູບ QR ຂອງທະນາຄານ',
    'qr.reading': 'ກຳລັງອ່ານ QR...',
    'qr.readOk': '✓ ອ່ານ QR ໄດ້ — ຈະຝັງຍອດເງິນໃຫ້ອັດຕະໂນມັດ',
    'qr.readFail': '⚠️ ອ່ານ QR ບໍ່ໄດ້ ຫຼື ບໍ່ແມ່ນ LAO QR — ຈະສະແດງເປັນຮູບທົ່ວໄປ (ລູກຄ້າຕ້ອງໃສ່ຍອດເອງ) ລອງໃຊ້ຮູບທີ່ຊັດກວ່ານີ້',
    'qr.add': 'ເພີ່ມທະນາຄານ',
    'qr.adding': 'ກຳລັງບັນທຶກ...',
    'qr.errName': 'ກະລຸນາໃສ່ຊື່ທະນາຄານ',
    'qr.errFile': 'ກະລຸນາເລືອກຮູບ QR',
    'qr.errSave': 'ບັນທຶກບໍ່ສຳເລັດ',
    'qr.full': 'ເພີ່ມໄດ້ສູງສຸດ 6 ທະນາຄານ ລຶບອັນເກົ່າກ່ອນ',
    'qr.loading': 'ກຳລັງໂຫຼດ...',
  },
  th: {
    'qr.title': 'รูป QR รับเงินของร้าน',
    'qr.hint': 'เพิ่ม QR ได้หลายธนาคาร (สูงสุด 6) ลูกค้าจะเลือกธนาคารก่อน แล้วจึงเห็น QR',
    'qr.empty': 'ยังไม่ได้เพิ่มธนาคาร — ระบบยังใช้ QR เดิมอยู่ เมื่อเพิ่มธนาคารแล้ว QR เดิมจะไม่ถูกใช้อีก อย่าลืมเพิ่มธนาคารเดิมเข้ารายการด้วย',
    'qr.auto': '✓ ฝังยอดอัตโนมัติ',
    'qr.static': 'รูปทั่วไป (ลูกค้าใส่ยอดเอง)',
    'qr.delete': 'ลบ',
    'qr.confirmDelete': 'ลบธนาคารนี้ออก?',
    'qr.addTitle': 'เพิ่มธนาคาร',
    'qr.bankName': 'ชื่อธนาคาร (เช่น BCEL, LDB, JDB)',
    'qr.logo': 'โลโก้',
    'qr.logoHint': 'โลโก้ธนาคาร (ไม่บังคับ)',
    'qr.logoRemove': 'เอาออก',
    'qr.qrLabel': 'รูป QR ของธนาคาร',
    'qr.reading': 'กำลังอ่าน QR...',
    'qr.readOk': '✓ อ่าน QR ได้ — จะฝังยอดเงินให้อัตโนมัติ',
    'qr.readFail': '⚠️ อ่าน QR ไม่ได้ หรือไม่ใช่ LAO QR — จะแสดงเป็นรูปทั่วไป (ลูกค้าต้องใส่ยอดเอง) ลองใช้รูปที่ชัดกว่านี้',
    'qr.add': 'เพิ่มธนาคาร',
    'qr.adding': 'กำลังบันทึก...',
    'qr.errName': 'กรุณาใส่ชื่อธนาคาร',
    'qr.errFile': 'กรุณาเลือกรูป QR',
    'qr.errSave': 'บันทึกไม่สำเร็จ',
    'qr.full': 'เพิ่มได้สูงสุด 6 ธนาคาร ลบอันเก่าก่อน',
    'qr.loading': 'กำลังโหลด...',
  },
  en: {
    'qr.title': 'Shop payment QR',
    'qr.hint': 'Add QR codes for several banks (max 6). Customers pick a bank first, then see its QR',
    'qr.empty': 'No banks added yet — the old QR is still in use. Once you add a bank, the old QR is no longer used, so add your existing bank to the list too',
    'qr.auto': '✓ Amount embedded automatically',
    'qr.static': 'Plain image (customer types the amount)',
    'qr.delete': 'Delete',
    'qr.confirmDelete': 'Remove this bank?',
    'qr.addTitle': 'Add a bank',
    'qr.bankName': 'Bank name (e.g. BCEL, LDB, JDB)',
    'qr.logo': 'Logo',
    'qr.logoHint': 'Bank logo (optional)',
    'qr.logoRemove': 'Remove',
    'qr.qrLabel': 'Bank QR image',
    'qr.reading': 'Reading QR...',
    'qr.readOk': '✓ QR read — the amount will be embedded automatically',
    'qr.readFail': '⚠️ Could not read the QR or it is not a LAO QR — it will show as a plain image (customer must type the amount). Try a clearer image',
    'qr.add': 'Add bank',
    'qr.adding': 'Saving...',
    'qr.errName': 'Please enter the bank name',
    'qr.errFile': 'Please choose a QR image',
    'qr.errSave': 'Could not save',
    'qr.full': 'Up to 6 banks. Delete one first',
    'qr.loading': 'Loading...',
  },
};

// ພະຍາຍາມອ່ານ QR ຈາກຮູບ ທີ່ຂະໜາດຕ່າງກັນ
function decodeAt(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const code = jsQR(data.data, w, h, { inversionAttempts: 'attemptBoth' });
  return code ? code.data : '';
}

function readQrText(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let text = '';
      try {
        for (const side of [1400, 900, 600]) {
          text = decodeAt(img, side);
          if (text) break;
        }
      } catch (e) {
        text = '';
      }
      URL.revokeObjectURL(url);
      resolve(text);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

// ຍ່ອໂລໂກ້ໃຫ້ນ້ອຍ (ດ້ານຍາວສຸດ 256px) ແລະ ຮັກສາພື້ນໂປ່ງໃສ (PNG)
function shrinkLogo(file, maxSide = 256) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob || file);
        },
        'image/png'
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

const inputStyle = {
  width: '100%', padding: 12, borderRadius: 8, border: '1px solid #dfe3e8',
  boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.98rem', margin: 0,
};

// ໂລໂກ້ທະນາຄານ (ຖ້າບໍ່ມີ ສະແດງວົງມົນມີຕົວອັກສອນທຳອິດແທນ)
function BankLogo({ bank, size = 44 }) {
  if (bank.logo) {
    return (
      <img
        src={bank.logo}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 10, background: '#fff', border: '1px solid #eee', flex: '0 0 auto' }}
      />
    );
  }
  return (
    <span
      style={{
        width: size, height: size, borderRadius: 10, flex: '0 0 auto', background: '#e8eefc', color: '#2563eb',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.42,
      }}
    >
      {Array.from(bank.name || '?')[0]}
    </span>
  );
}

export default function PaymentQrModal({ onClose }) {
  const { t } = usePageT(dict);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [payload, setPayload] = useState('');
  const [readState, setReadState] = useState('idle'); // idle | reading | ok | fail
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef(null);
  const logoRef = useRef(null);

  async function load() {
    try {
      const res = await fetch('/api/settings/payment-banks');
      const data = await res.json();
      setBanks(Array.isArray(data.banks) ? data.banks : []);
    } catch (e) {
      setBanks([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPickFile(e) {
    const f = e.target.files && e.target.files[0];
    setError('');
    if (!f) {
      setFile(null);
      setPayload('');
      setReadState('idle');
      return;
    }
    setFile(f);
    setReadState('reading');
    const text = await readQrText(f);
    if (text && canBuildDynamic(text)) {
      setPayload(text);
      setReadState('ok');
    } else {
      setPayload('');
      setReadState('fail');
    }
  }

  async function onPickLogo(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const small = await shrinkLogo(f);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(small);
    setLogoPreview(URL.createObjectURL(small));
  }

  function removeLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview('');
  }

  async function addBank() {
    setError('');
    if (!name.trim()) {
      setError(t('qr.errName'));
      return;
    }
    if (!file) {
      setError(t('qr.errFile'));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('payload', payload);
      fd.append('qrImage', file);
      if (logoFile) fd.append('logo', logoFile, 'logo.png');
      const res = await fetch('/api/settings/payment-banks', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setName('');
        setFile(null);
        setPayload('');
        setReadState('idle');
        removeLogo();
        if (fileRef.current) fileRef.current.value = '';
        await load();
      } else {
        setError(data.error || t('qr.errSave'));
      }
    } catch (e) {
      setError(t('qr.errSave'));
    }
    setSaving(false);
  }

  async function confirmDelete() {
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await fetch(`/api/settings/payment-banks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...getAuthHeader() },
      });
    } catch (e) {
      // ຖ້າລຶບບໍ່ໄດ້ ໂຫຼດໃໝ່ແລ້ວຈະເຫັນເອງ
    }
    load();
  }

  const full = banks.length >= MAX_BANKS;

  return (
    <>
      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div
          className="modal-box"
          style={{ background: '#fff', color: '#1f2937', width: 680, maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', padding: '28px 28px 24px' }}
        >
          <button className="modal-close" style={{ color: '#1f2937' }} onClick={onClose}>✕</button>
          <h2 style={{ color: 'var(--navy)', textAlign: 'center', fontSize: '1.5rem', marginTop: 0 }}>{t('qr.title')}</h2>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: '0 0 16px' }}>{t('qr.hint')}</p>

          {loading ? (
            <p style={{ textAlign: 'center' }}>{t('qr.loading')}</p>
          ) : (
            <>
              {banks.length === 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '10px 14px', fontSize: '0.92rem', marginBottom: 16 }}>
                  {t('qr.empty')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {banks.map((b) => (
                    <div
                      key={b.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}
                    >
                      <a href={b.image} target="_blank" rel="noreferrer" style={{ flex: '0 0 auto' }}>
                        <img
                          src={b.image}
                          alt={b.name}
                          style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee', display: 'block' }}
                        />
                      </a>
                      <BankLogo bank={b} size={48} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{b.name}</div>
                        <div style={{ fontSize: '0.85rem', color: b.payload ? '#15803d' : '#6b7280', marginTop: 2 }}>
                          {b.payload ? t('qr.auto') : t('qr.static')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(b.id)}
                        style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {t('qr.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 10 }}>{t('qr.addTitle')}</div>
                {full ? (
                  <div style={{ color: '#6b7280', fontSize: '0.92rem' }}>{t('qr.full')}</div>
                ) : (
                  <>
                    {/* ແຖວ: ໂລໂກ້ + ຊື່ທະນາຄານ */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                      <button
                        type="button"
                        title={t('qr.logoHint')}
                        onClick={() => logoRef.current && logoRef.current.click()}
                        style={{
                          width: 64, height: 64, flex: '0 0 auto', borderRadius: 12, cursor: 'pointer', padding: 0,
                          border: '2px dashed #cbd5e1', background: '#f8fafc', color: '#64748b', fontSize: '0.72rem',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                          overflow: 'hidden',
                        }}
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
                        ) : (
                          <>
                            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>＋</span>
                            {t('qr.logo')}
                          </>
                        )}
                      </button>
                      <input ref={logoRef} type="file" accept="image/*" onChange={onPickLogo} style={{ display: 'none' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          style={inputStyle}
                          placeholder={t('qr.bankName')}
                          maxLength={40}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        {logoFile ? (
                          <button
                            type="button"
                            onClick={removeLogo}
                            style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.82rem', padding: '4px 0 0', textDecoration: 'underline' }}
                          >
                            {t('qr.logoRemove')}
                          </button>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', paddingTop: 4 }}>{t('qr.logoHint')}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 4 }}>{t('qr.qrLabel')}</div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickFile}
                      style={{ ...inputStyle, background: '#f8fafc', marginBottom: 10 }}
                    />
                    {readState === 'reading' && (
                      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 10 }}>{t('qr.reading')}</div>
                    )}
                    {readState === 'ok' && (
                      <div style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: 10 }}>{t('qr.readOk')}</div>
                    )}
                    {readState === 'fail' && (
                      <div style={{ fontSize: '0.9rem', color: '#b45309', marginBottom: 10 }}>{t('qr.readFail')}</div>
                    )}
                    {error && <div style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: 10 }}>{error}</div>}
                    <button
                      type="button"
                      disabled={saving || readState === 'reading'}
                      onClick={addBank}
                      style={{
                        width: '100%', background: 'var(--blue)', color: '#fff', border: 'none',
                        padding: '13px 16px', borderRadius: 8, fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
                        opacity: saving || readState === 'reading' ? 0.6 : 1,
                      }}
                    >
                      {saving ? t('qr.adding') : t('qr.add')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        message={t('qr.confirmDelete')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}