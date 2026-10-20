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
    'qr.edit': 'ແກ້ໄຂ',
    'qr.delete': 'ລຶບ',
    'qr.confirmDelete': 'ລຶບທະນາຄານນີ້ອອກ?',
    'qr.addTitle': 'ເພີ່ມທະນາຄານ',
    'qr.editTitle': 'ແກ້ໄຂທະນາຄານ',
    'qr.bankName': 'ຊື່ທະນາຄານ (ເຊັ່ນ BCEL, LDB, JDB)',
    'qr.logo': 'ໂລໂກ້',
    'qr.logoHint': 'ໂລໂກ້ທະນາຄານ (ບໍ່ບັງຄັບ)',
    'qr.logoRemove': 'ເອົາໂລໂກ້ອອກ',
    'qr.qrLabel': 'ຮູບ QR ຂອງທະນາຄານ',
    'qr.newQrLabel': 'ຮູບ QR ໃໝ່ (ບໍ່ບັງຄັບ)',
    'qr.keepQr': 'ກົດທີ່ຮູບ QR ເພື່ອປ່ຽນ ຖ້າບໍ່ເລືອກຈະໃຊ້ QR ເດີມ',
    'qr.change': 'ປ່ຽນ QR',
    'qr.pickQr': 'ເລືອກຮູບ QR',
    'qr.reading': 'ກຳລັງອ່ານ QR...',
    'qr.readOk': '✓ ອ່ານ QR ໄດ້ — ຈະຝັງຍອດເງິນໃຫ້ອັດຕະໂນມັດ',
    'qr.readFail': '⚠️ ອ່ານ QR ບໍ່ໄດ້ ຫຼື ບໍ່ແມ່ນ LAO QR — ຈະສະແດງເປັນຮູບທົ່ວໄປ (ລູກຄ້າຕ້ອງໃສ່ຍອດເອງ) ລອງໃຊ້ຮູບທີ່ຊັດກວ່ານີ້',
    'qr.add': 'ເພີ່ມທະນາຄານ',
    'qr.adding': 'ກຳລັງບັນທຶກ...',
    'qr.saveEdit': 'ບັນທຶກ',
    'qr.cancelEdit': 'ຍົກເລີກ',
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
    'qr.edit': 'แก้ไข',
    'qr.delete': 'ลบ',
    'qr.confirmDelete': 'ลบธนาคารนี้ออก?',
    'qr.addTitle': 'เพิ่มธนาคาร',
    'qr.editTitle': 'แก้ไขธนาคาร',
    'qr.bankName': 'ชื่อธนาคาร (เช่น BCEL, LDB, JDB)',
    'qr.logo': 'โลโก้',
    'qr.logoHint': 'โลโก้ธนาคาร (ไม่บังคับ)',
    'qr.logoRemove': 'เอาโลโก้ออก',
    'qr.qrLabel': 'รูป QR ของธนาคาร',
    'qr.newQrLabel': 'รูป QR ใหม่ (ไม่บังคับ)',
    'qr.keepQr': 'กดที่รูป QR เพื่อเปลี่ยน ถ้าไม่เลือกจะใช้ QR เดิม',
    'qr.change': 'เปลี่ยน QR',
    'qr.pickQr': 'เลือกรูป QR',
    'qr.reading': 'กำลังอ่าน QR...',
    'qr.readOk': '✓ อ่าน QR ได้ — จะฝังยอดเงินให้อัตโนมัติ',
    'qr.readFail': '⚠️ อ่าน QR ไม่ได้ หรือไม่ใช่ LAO QR — จะแสดงเป็นรูปทั่วไป (ลูกค้าต้องใส่ยอดเอง) ลองใช้รูปที่ชัดกว่านี้',
    'qr.add': 'เพิ่มธนาคาร',
    'qr.adding': 'กำลังบันทึก...',
    'qr.saveEdit': 'บันทึก',
    'qr.cancelEdit': 'ยกเลิก',
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
    'qr.edit': 'Edit',
    'qr.delete': 'Delete',
    'qr.confirmDelete': 'Remove this bank?',
    'qr.addTitle': 'Add a bank',
    'qr.editTitle': 'Edit bank',
    'qr.bankName': 'Bank name (e.g. BCEL, LDB, JDB)',
    'qr.logo': 'Logo',
    'qr.logoHint': 'Bank logo (optional)',
    'qr.logoRemove': 'Remove logo',
    'qr.qrLabel': 'Bank QR image',
    'qr.newQrLabel': 'New QR image (optional)',
    'qr.keepQr': 'Click the QR image to change it. If you do not, the current QR is kept',
    'qr.change': 'Change QR',
    'qr.pickQr': 'Choose QR',
    'qr.reading': 'Reading QR...',
    'qr.readOk': '✓ QR read — the amount will be embedded automatically',
    'qr.readFail': '⚠️ Could not read the QR or it is not a LAO QR — it will show as a plain image (customer must type the amount). Try a clearer image',
    'qr.add': 'Add bank',
    'qr.adding': 'Saving...',
    'qr.saveEdit': 'Save',
    'qr.cancelEdit': 'Cancel',
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
  width: '100%', height: 44, padding: '0 12px', borderRadius: 8, border: '1px solid #dfe3e8',
  boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.98rem', margin: 0, background: '#fff',
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

  // editingId = null → ໂໝດເພີ່ມ (ຟອມລຸ່ມສຸດ), ມີຄ່າ → ແກ້ໄຂໃນແຖວຂອງທະນາຄານນັ້ນ
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [payload, setPayload] = useState('');
  const [readState, setReadState] = useState('idle'); // idle | reading | ok | fail
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [existingLogo, setExistingLogo] = useState('');
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef(null);
  const logoRef = useRef(null);
  const logoPreviewRef = useRef('');
  const qrPreviewRef = useRef('');
  logoPreviewRef.current = logoPreview;
  qrPreviewRef.current = qrPreview;

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
    return () => {
      if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
      if (qrPreviewRef.current) URL.revokeObjectURL(qrPreviewRef.current);
    };
  }, []);

  function clearNewLogo() {
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    setLogoFile(null);
    setLogoPreview('');
  }

  function clearNewQr() {
    if (qrPreviewRef.current) URL.revokeObjectURL(qrPreviewRef.current);
    setFile(null);
    setQrPreview('');
    setPayload('');
    setReadState('idle');
    if (fileRef.current) fileRef.current.value = '';
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    clearNewQr();
    clearNewLogo();
    setExistingLogo('');
    setLogoRemoved(false);
    setError('');
  }

  function startEdit(b) {
    clearNewQr();
    clearNewLogo();
    setEditingId(b.id);
    setName(b.name || '');
    setExistingLogo(b.logo || '');
    setLogoRemoved(false);
    setError('');
  }

  async function onPickFile(e) {
    const f = e.target.files && e.target.files[0];
    setError('');
    if (!f) {
      clearNewQr();
      return;
    }
    if (qrPreviewRef.current) URL.revokeObjectURL(qrPreviewRef.current);
    setFile(f);
    setQrPreview(URL.createObjectURL(f));
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
    clearNewLogo();
    setLogoFile(small);
    setLogoPreview(URL.createObjectURL(small));
    setLogoRemoved(false);
  }

  // ເອົາໂລໂກ້ອອກ (ທັງອັນໃໝ່ທີ່ເລືອກ ແລະ ອັນເດີມທີ່ບັນທຶກໄວ້)
  function removeLogo() {
    clearNewLogo();
    if (existingLogo) setLogoRemoved(true);
  }

  async function submit() {
    setError('');
    if (!name.trim()) {
      setError(t('qr.errName'));
      return;
    }
    if (!editingId && !file) {
      setError(t('qr.errFile'));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (file) {
        fd.append('payload', payload);
        fd.append('qrImage', file);
      }
      if (logoFile) fd.append('logo', logoFile, 'logo.png');
      else if (editingId && logoRemoved) fd.append('removeLogo', '1');

      const url = editingId
        ? `/api/settings/payment-banks/${editingId}`
        : '/api/settings/payment-banks';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { ...getAuthHeader() },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        resetForm();
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
    if (id === editingId) resetForm();
    load();
  }

  const full = banks.length >= MAX_BANKS;
  const logoShown = logoPreview || (!logoRemoved && existingLogo ? existingLogo : '');
  const busy = saving || readState === 'reading';

  // ຟອມກະທັດຮັດ (ໃຊ້ຮ່ວມກັນ ທັງໂໝດເພີ່ມ ແລະ ໂໝດແກ້ໄຂໃນແຖວ)
  // ເປັນຟັງຊັນທີ່ return JSX (ບໍ່ແມ່ນ component) ເພື່ອບໍ່ໃຫ້ input ເສຍ focus ຕອນພິມ
  function renderForm(editingBank) {
    const qrSrc = qrPreview || (editingBank ? editingBank.image : '');
    return (
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* ຊ້າຍ: ຮູບ QR (ກົດເພື່ອເລືອກຮູບໃໝ່) */}
        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          title={editingBank ? t('qr.newQrLabel') : t('qr.qrLabel')}
          style={{
            position: 'relative', width: 96, height: 96, flex: '0 0 auto', padding: 0, overflow: 'hidden',
            borderRadius: 10, cursor: 'pointer',
            border: qrSrc ? '1px solid #e5e7eb' : '2px dashed #cbd5e1',
            background: qrSrc ? '#fff' : '#f8fafc', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {qrSrc ? (
            <>
              <img src={qrSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, padding: '4px 0',
                  background: 'rgba(17,24,39,.72)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, textAlign: 'center',
                }}
              >
                {t('qr.change')}
              </span>
            </>
          ) : (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600 }}>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>＋</span>
              {t('qr.pickQr')}
            </span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} />
        <input ref={logoRef} type="file" accept="image/*" onChange={onPickLogo} style={{ display: 'none' }} />

        {/* ຂວາ: ຊື່ + ໂລໂກ້ + ປຸ່ມ */}
        <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              title={t('qr.logoHint')}
              onClick={() => logoRef.current && logoRef.current.click()}
              style={{
                width: 44, height: 44, flex: '0 0 auto', borderRadius: 10, cursor: 'pointer', padding: 0,
                border: logoShown ? '1px solid #e5e7eb' : '2px dashed #cbd5e1',
                background: logoShown ? '#fff' : '#f8fafc', color: '#64748b', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', lineHeight: 1,
              }}
            >
              {logoShown ? (
                <img src={logoShown} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                '＋'
              )}
            </button>
            <input
              style={inputStyle}
              placeholder={t('qr.bankName')}
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.8rem', minHeight: 18, lineHeight: 1.35 }}>
            {readState === 'reading' && <span style={{ color: '#6b7280' }}>{t('qr.reading')}</span>}
            {readState === 'ok' && <span style={{ color: '#15803d' }}>{t('qr.readOk')}</span>}
            {readState === 'fail' && <span style={{ color: '#b45309' }}>{t('qr.readFail')}</span>}
            {readState === 'idle' && (
              <span style={{ color: '#6b7280' }}>
                {editingBank ? t('qr.keepQr') : t('qr.qrLabel')}
                {logoShown && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={removeLogo}
                      style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}
                    >
                      {t('qr.logoRemove')}
                    </button>
                  </>
                )}
              </span>
            )}
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editingBank && (
              <button
                type="button"
                disabled={saving}
                onClick={resetForm}
                style={{
                  background: '#fff', color: '#374151', border: '1px solid #dfe3e8',
                  height: 40, padding: '0 18px', borderRadius: 8, fontWeight: 600, fontSize: '0.92rem', cursor: 'pointer',
                }}
              >
                {t('qr.cancelEdit')}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              style={{
                background: 'var(--blue)', color: '#fff', border: 'none',
                height: 40, padding: '0 22px', borderRadius: 8, fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
                opacity: busy ? 0.6 : 1,
              }}
            >
              {saving ? t('qr.adding') : editingBank ? t('qr.saveEdit') : t('qr.add')}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  {banks.map((b) => {
                    const isEditing = editingId === b.id;
                    return (
                      <div
                        key={b.id}
                        style={{
                          borderRadius: 12, padding: 12,
                          border: isEditing ? '1.5px solid var(--blue)' : '1px solid #e5e7eb',
                          background: isEditing ? '#f5f9ff' : '#fff',
                          boxShadow: isEditing ? '0 0 0 3px rgba(37,99,235,.10)' : 'none',
                        }}
                      >
                        {isEditing ? (
                          // ໂໝດແກ້ໄຂ: ຟອມຂຶ້ນໃນແຖວນີ້ເລີຍ
                          renderForm(b)
                        ) : (
                          // ໂໝດປົກກະຕິ
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                            <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
                              <button
                                type="button"
                                onClick={() => startEdit(b)}
                                style={{ border: '1px solid var(--blue)', background: '#fff', color: 'var(--blue)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
                              >
                                {t('qr.edit')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(b.id)}
                                style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
                              >
                                {t('qr.delete')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ຟອມເພີ່ມທະນາຄານ (ສະແດງສະເພາະຕອນບໍ່ໄດ້ແກ້ໄຂແຖວໃດ) */}
              {!editingId && (
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12 }}>
                    {t('qr.addTitle')}
                  </div>
                  {full ? (
                    <div style={{ color: '#6b7280', fontSize: '0.92rem' }}>{t('qr.full')}</div>
                  ) : (
                    renderForm(null)
                  )}
                </div>
              )}
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