import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiUpload } from '../../api.js';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-checkout.js';

const STEP_KEYS = ['co.step1', 'co.step2'];
const MAX_SAVED_ADDRESSES = 5;

// key ຕ້ອງກົງກັບ VALID_CARRIERS ໃນ backend/routes/orders.js
// ໂລໂກ້ຢູ່ frontend/public/carriers/<key>.png (ຖ້າບໍ່ມີ ຈະສະແດງຕົວອັກສອນແທນ)
const CARRIERS = [
  { key: 'anousith', name: 'Anousith Express', color: '#c62828' },
  { key: 'hal', name: 'HAL Express', color: '#d32f2f' },
  { key: 'mixay', name: 'Mixay Express', color: '#b71c1c' },
];

// ຂົນສົ່ງທີ່ມີຂໍ້ມູນສາຂາ (ເລືອກ ແຂວງ → ເມືອງ → ສາຂາ) — ຕ້ອງກົງກັບ backend (BRANCH_CARRIERS)
const BRANCH_CARRIERS = ['anousith', 'hal'];

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
.checkout-page.co-wide { max-width: 980px; padding-bottom: 140px; }

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

/* ລາຍການຂົນສົ່ງທີ່ຂະຫຍາຍອອກໃນການ໌ດໜ້າ 2 (ປ່ຽນຂົນສົ່ງໂດຍບໍ່ກັບໜ້າ 1) */
.co-carriers-inline {
  margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--cust-border); gap: 8px;
}
.co-carriers-inline .co-carrier { padding: 9px 12px; gap: 12px; }
.co-carriers-inline .co-carrier-name { font-size: 0.95rem; }

/* ຄ່າສົ່ງ + ແຖບຄວາມຄືບໜ້າສົ່ງຟຣີ */
.co-ship-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; font-size: 0.95rem; color: var(--cust-text);
}
.co-free { color: #15803d; font-weight: 800; }
.co-ship-hint {
  margin-top: 8px; padding: 12px 14px; border-radius: 12px; background: #fffaf0;
  border: 1px solid #f1e3b8; font-size: 0.88rem; color: var(--cust-text);
}
.co-ship-hint.ok { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; font-weight: 700; }
.co-ship-bar { height: 8px; border-radius: 999px; background: #f1e8cf; margin-top: 8px; overflow: hidden; }
.co-ship-bar i { display: block; height: 100%; border-radius: 999px; background: var(--gold); transition: width 0.3s; }

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

/* ເລືອກສາຂາຂົນສົ່ງ (ແຂວງ → ເມືອງ → ສາຂາ) — dropdown ທີ່ເປີດລົງດ້ານລຸ່ມສະເໝີ */
.co-dd { position: relative; margin-bottom: 10px; }
.co-dd-btn {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 11px 12px; border: 1.5px solid var(--cust-border); border-radius: 10px;
  background: #fff; font-size: 0.95rem; font-family: inherit; color: var(--cust-text);
  cursor: pointer; text-align: left;
}
.co-dd-btn:hover:not(:disabled), .co-dd-btn.open { border-color: var(--gold); }
.co-dd-btn:disabled { background: #f6f6f4; color: #aaa; cursor: not-allowed; }
.co-dd-btn .ph { color: #999; }
.co-dd-btn svg { flex: 0 0 auto; transition: transform 0.15s; }
.co-dd-btn.open svg { transform: rotate(180deg); }
.co-dd-list {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 60; margin: 4px 0 0; padding: 4px;
  list-style: none; max-height: 240px; overflow-y: auto; background: #fff;
  border: 1px solid var(--cust-border); border-radius: 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
}
.co-dd-list li { padding: 10px 12px; border-radius: 8px; font-size: 0.92rem; cursor: pointer; color: var(--cust-text); }
.co-dd-list li:hover { background: #fffaf0; }
.co-dd-list li.sel { background: #fffaf0; color: #b8862b; font-weight: 700; }
.co-dd-list li.empty { color: #999; cursor: default; }
.co-dd-list li.empty:hover { background: transparent; }

.co-branch-info {
  margin-top: 4px; padding: 10px 12px; border-radius: 10px; background: #fffaf0;
  border: 1px solid #f1e3b8; font-size: 0.85rem; color: var(--cust-text); line-height: 1.5;
}

/* ---------- ໜ້າ 2: ສອງຝັ່ງ ---------- */
.co-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 28px; align-items: start;
}
.co-col h2 { margin: 0 0 14px; font-size: 1.5em; }
.co-stack { display: flex; flex-direction: column; gap: 12px; }

/* ຄູປອງສ່ວນລົດ */
.co-coupon {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;
  padding: 11px 12px; margin-bottom: 8px; border: 1.5px solid var(--cust-border); border-radius: 12px;
  background: #fff; cursor: pointer; text-align: left; font-family: inherit; color: var(--cust-text);
}
.co-coupon:last-child { margin-bottom: 0; }
.co-coupon:hover:not(:disabled) { border-color: var(--gold); }
.co-coupon.selected {
  border-color: var(--gold); background: #fffaf0; box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15);
}
.co-coupon:disabled { opacity: 0.5; cursor: not-allowed; }
.co-coupon-name { font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 8px; }
.co-coupon-count {
  padding: 1px 8px; border-radius: 999px; background: #faf0cf; color: #9a7412;
  font-size: 0.75rem; font-weight: 800;
}
.co-coupon-sub { font-size: 0.78rem; color: var(--cust-text-muted); margin-top: 2px; }
.co-coupon-save { color: #b8862b; font-weight: 800; font-size: 0.9rem; white-space: nowrap; }

/* ສະຫຼຸບຍອດ */
.co-sum { margin-bottom: 12px; }
.co-sum-title { font-weight: 700; margin-bottom: 8px; color: var(--cust-text); }
.co-sum-row {
  display: flex; justify-content: space-between; gap: 10px; padding: 6px 0;
  font-size: 0.92rem; color: var(--cust-text);
}
.co-sum-row.disc span:last-child { color: #15803d; font-weight: 700; }
.co-sum-row.net {
  margin-top: 6px; padding-top: 10px; border-top: 1px dashed var(--cust-border);
  font-weight: 800; font-size: 1.05rem;
}
.co-sum-row.net span:last-child { color: #b8862b; }

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

/* ຍອດທີ່ຕ້ອງໂອນ (ໃຫຍ່ + ປຸ່ມຄັດລອກ) */
.co-amount {
  background: #fffaf0; border: 1px solid #f1e3b8; border-radius: 14px;
  padding: 12px 14px; margin-bottom: 14px; text-align: center;
}
.co-amount-label { font-size: 0.82rem; color: var(--cust-text-muted); }
.co-amount-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 4px 0; flex-wrap: wrap; }
.co-amount-num { font-size: 1.7rem; font-weight: 800; color: #b8862b; line-height: 1.2; }
.co-copy {
  padding: 6px 14px; border-radius: 999px; border: 1px solid var(--gold); background: #fff;
  color: #b8862b; font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit;
}
.co-copy:hover { background: var(--gold); color: #fff; }
.co-amount-hint { font-size: 0.78rem; color: #b45309; }

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

// ຄຳນວນສ່ວນລົດຄູປອງ (ໃຊ້ສະແດງຜົນເທົ່ານັ້ນ — backend ຄຳນວນຈິງຕອນສັ່ງຊື້ອີກຄັ້ງ)
function calcDiscount(c, subtotal) {
  if (!c || subtotal < c.min_order) return 0;
  let d = c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.type === 'percent' && c.max_discount) d = Math.min(d, c.max_discount);
  return Math.min(d, subtotal);
}

// ຄ່າສົ່ງ (ໃຊ້ສະແດງຜົນເທົ່ານັ້ນ — backend ຄຳນວນຈິງ ແລະ ສົ່ງຄືນມາຕອນສັ່ງຊື້)
function calcShipping(cfg, subtotal) {
  if (!cfg.flat_fee || cfg.flat_fee <= 0) return 0;
  if (cfg.free_min > 0 && subtotal >= cfg.free_min) return 0;
  return cfg.flat_fee;
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

// dropdown ທີ່ເປີດລົງດ້ານລຸ່ມສະເໝີ (ແທນ <select> ທີ່ browser ອາດເປີດຂຶ້ນດ້ານເທິງ)
function DropSelect({ value, onChange, options, placeholder, disabled }) {
  const { t } = usePageT(dict);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // ເລື່ອນໜ້າໃຫ້ເຫັນລາຍການທີ່ເປີດລົງມາຄົບ
    if (next && ref.current) {
      setTimeout(() => ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    }
  }

  const current = options.find((o) => o.value === value);

  return (
    <div className="co-dd" ref={ref}>
      <button type="button" className={`co-dd-btn${open ? ' open' : ''}`} disabled={disabled} onClick={toggle}>
        <span className={current ? '' : 'ph'}>{current ? current.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="co-dd-list">
          {options.length === 0 && <li className="empty">{t('co.noData')}</li>}
          {options.map((o) => (
            <li
              key={o.value}
              className={o.value === value ? 'sel' : ''}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckoutInner() {
  const { t } = usePageT(dict);
  const kip = t('common.kip');
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [carrier, setCarrier] = useState('');
  const [changingCarrier, setChangingCarrier] = useState(false); // ເປີດລາຍການປ່ຽນຂົນສົ່ງໃນໜ້າ 2
  const [payMethod, setPayMethod] = useState('transfer'); // 'transfer' | 'cod'
  const [step, setStep] = useState(1);

  const [savedAddrs, setSavedAddrs] = useState([]);
  const [saveAddr, setSaveAddr] = useState(true);

  // ສາຂາຂົນສົ່ງ: ແຂວງ → ເມືອງ → ສາຂາ
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [provinceId, setProvinceId] = useState('');
  const [district, setDistrict] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);

  const [qrImage, setQrImage] = useState('');
  const [qrMissing, setQrMissing] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  // ຄູປອງໃນກະເປົາຂອງລູກຄ້າ + ກຸ່ມຄູປອງທີ່ເລືອກໃຊ້ (ຄູປອງຊ້ຳກັນຖືກລວມເປັນກຸ່ມດຽວ)
  const [coupons, setCoupons] = useState([]);
  const [couponKey, setCouponKey] = useState(null);

  // ຄ່າສົ່ງ (ມາຈາກ backend): flat_fee = ຄ່າສົ່ງເໝົາ, free_min = ຍອດຂັ້ນຕ່ຳສົ່ງຟຣີ
  const [shipCfg, setShipCfg] = useState({ flat_fee: 0, free_min: 0 });

  // กล่องแจ้งข้อความแทน alert(): { message, onClose }
  const [notice, setNotice] = useState(null);

  function showNotice(message, onClose) {
    setNotice({ message, onClose });
  }
  function closeNotice() {
    const fn = notice && notice.onClose;
    setNotice(null);
    if (fn) fn();
  }

  useEffect(() => {
    (async () => {
      const [cartRes, meRes, qrRes, addrRes, cpRes, shipRes] = await Promise.all([
        apiGet('/api/cart'),
        apiGet('/api/customer-auth/me'),
        apiGet('/api/settings/payment-qr'),
        apiGet('/api/customer-account/addresses'),
        apiGet('/api/coupons/me'),
        apiGet('/api/orders/shipping-config'),
      ]);

      if (cartRes.ok && Array.isArray(cartRes.data.items)) {
        if (cartRes.data.items.length === 0) {
          showNotice(t('co.alertEmptyCart'), () => navigate('/menu'));
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

      if (cpRes.ok && Array.isArray(cpRes.data.coupons)) {
        setCoupons(cpRes.data.coupons);
      }

      if (shipRes.ok && shipRes.data) {
        setShipCfg({
          flat_fee: Number(shipRes.data.flat_fee) || 0,
          free_min: Number(shipRes.data.free_min) || 0,
        });
      }

      if (qrRes.ok && qrRes.data.qrImage) {
        setQrImage(qrRes.data.qrImage);
      } else {
        setQrMissing(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ປ່ຽນຂົນສົ່ງ → ລ້າງສິ່ງທີ່ເລືອກ ແລ້ວໂຫລດລາຍຊື່ແຂວງ (ສະເພາະຂົນສົ່ງທີ່ມີຂໍ້ມູນສາຂາ)
  useEffect(() => {
    setProvinces([]);
    setDistricts([]);
    setBranches([]);
    setProvinceId('');
    setDistrict('');
    setBranchId('');
    if (!BRANCH_CARRIERS.includes(carrier)) return;

    (async () => {
      setBranchLoading(true);
      const r = await apiGet(`/api/carriers/${carrier}/provinces`);
      if (r.ok && Array.isArray(r.data.provinces)) setProvinces(r.data.provinces);
      setBranchLoading(false);
    })();
  }, [carrier]);

  async function onProvinceChange(id) {
    setProvinceId(id);
    setDistrict('');
    setBranchId('');
    setDistricts([]);
    setBranches([]);
    if (!id) return;
    setBranchLoading(true);
    const r = await apiGet(`/api/carriers/${carrier}/districts?province=${encodeURIComponent(id)}`);
    if (r.ok && Array.isArray(r.data.districts)) setDistricts(r.data.districts);
    setBranchLoading(false);
  }

  async function onDistrictChange(d) {
    setDistrict(d);
    setBranchId('');
    setBranches([]);
    if (!d) return;
    setBranchLoading(true);
    const r = await apiGet(
      `/api/carriers/${carrier}/branches?province=${encodeURIComponent(provinceId)}&district=${encodeURIComponent(d)}`
    );
    if (r.ok && Array.isArray(r.data.branches)) setBranches(r.data.branches);
    setBranchLoading(false);
  }

  const noticeModal = (
    <ConfirmModal
      open={!!notice}
      message={notice ? notice.message : ''}
      hideCancel
      onConfirm={closeNotice}
      onCancel={closeNotice}
    />
  );

  if (!items && !loadError) {
    return (
      <div className="customer-shell">
        <TopBar />
        <p style={{ padding: 20, color: 'var(--cust-text-muted)' }}>{t('common.loading')}</p>
        {noticeModal}
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="customer-shell">
        <TopBar />
        <div style={{ padding: 20, color: 'var(--cust-text-muted)' }}>
          <p>{t('co.loadFail')}</p>
          <button onClick={() => navigate('/menu/cart')}>{t('co.backToCart')}</button>
        </div>
        {noticeModal}
      </div>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // ລວມຄູປອງທີ່ຄືກັນ (ຊື່/ປະເພດ/ມູນຄ່າ/ຂັ້ນຕ່ຳ ຄືກັນ) ເປັນກຸ່ມດຽວ ສະແດງ ×ຈຳນວນ — ໃຊ້ໃບທີ່ໝົດອາຍຸກ່ອນສຸດ
  const couponGroups = (() => {
    const map = new Map();
    [...coupons]
      .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
      .forEach((c) => {
        const key = [c.name, c.type, c.value, c.min_order, c.max_discount || 0].join('|');
        if (!map.has(key)) map.set(key, { key, rep: c, count: 0 });
        map.get(key).count += 1;
      });
    return [...map.values()];
  })();
  const selectedCoupon = (couponGroups.find((g) => g.key === couponKey) || {}).rep;
  const discount = selectedCoupon ? calcDiscount(selectedCoupon, subtotal) : 0;

  const shippingEnabled = shipCfg.flat_fee > 0;
  const shippingFee = calcShipping(shipCfg, subtotal);
  const total = subtotal - discount + shippingFee; // ຍອດທີ່ຕ້ອງຈ່າຍຈິງ

  const carrierObj = CARRIERS.find((c) => c.key === carrier);
  const usesBranch = BRANCH_CARRIERS.includes(carrier);
  const selectedBranch = branches.find((b) => b.branch_id === branchId);
  const addressIsNew =
    address.trim() !== '' && !savedAddrs.some((a) => a.address.trim() === address.trim());

  function goStep(n) {
    setStep(n);
    window.scrollTo(0, 0);
  }

  function validateStep1() {
    if (!carrier) {
      showNotice(t('co.alertCarrier'));
      return;
    }
    goStep(2);
  }

  function pickCarrier(key) {
    setCarrier(key);
    setChangingCarrier(false);
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

  // ຄັດລອກຍອດທີ່ຕ້ອງໂອນ (ຕົວເລກລ້ວນ ວາງໃນແອັບທະນາຄານໄດ້ເລີຍ)
  async function copyAmount() {
    const text = String(total);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e2) {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submitOrder() {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\+?\d{8,15}$/.test(cleanPhone)) {
      showNotice(t('co.alertPhone'));
      return;
    }
    if (usesBranch) {
      if (!provinceId) {
        showNotice(t('co.alertProvince'));
        return;
      }
      if (!district) {
        showNotice(t('co.alertDistrict'));
        return;
      }
      if (!branchId) {
        showNotice(t('co.alertBranch'));
        return;
      }
    } else if (!address.trim()) {
      showNotice(t('co.alertAddress'));
      return;
    }
    if (payMethod === 'transfer' && !slipFile) {
      showNotice(t('co.alertSlip'));
      return;
    }

    setConfirming(true);
    try {
      const formData = new FormData();
      formData.append('customer_phone', cleanPhone);
      formData.append('carrier', carrier);
      formData.append('payment_method', payMethod);
      if (selectedCoupon) formData.append('user_coupon_id', selectedCoupon.id);
      if (usesBranch) {
        formData.append('branch_id', branchId);
      } else {
        formData.append('customer_address', address.trim());
      }
      if (payMethod === 'transfer') formData.append('slip', slipFile);

      const { ok, data } = await apiUpload('/api/orders', formData);

      if (ok) {
        // ★ ຂໍ້ຄວາມສະຫຼຸບອໍເດີທີ່ສົ່ງເຂົ້າແຊັດ ຄົງເປັນພາສາລາວສະເໝີ ແລະ ແຍກເປັນບັນທັດ
        //   (ໜ້າແຊັດ parse ຕາມບັນທັດ ແລະ ແອດມິນອ່ານ) — ຢ່າແປ ຫຼື ປ່ຽນຊື່ຫົວຂໍ້ (ຄ່າສິນຄ້າ/ຄ່າສົ່ງ/ລວມ...)
        const addrText = data.address || address.trim();
        const finalShipping = Number(data.shipping_fee ?? shippingFee) || 0;
        const finalTotal = Number(data.total ?? total);
        const itemLines = items
          .map((i) => `- ${i.name}${i.chosen_size ? ` (ໄຊສ໌ ${i.chosen_size})` : ''} x${i.quantity} = ${i.price * i.quantity} ກີບ`)
          .join('\n');
        const methodText = payMethod === 'cod' ? 'ເກັບເງິນປາຍທາງ (COD)' : 'ໂອນເງິນ';
        const orderMessage = [
          'ສັ່ງຊື້ໃໝ່:',
          itemLines,
          `ຄ່າສິນຄ້າ: ${subtotal} ກີບ`,
          shippingEnabled ? `ຄ່າສົ່ງ: ${finalShipping > 0 ? `${finalShipping} ກີບ` : 'ຟຣີ'}` : null,
          discount > 0 ? `ຄູປອງ: ${selectedCoupon.name} (-${discount} ກີບ)` : null,
          `ລວມ: ${finalTotal} ກີບ`,
          `ຂົນສົ່ງ: ${carrierObj.name}`,
          `ວິທີຊຳລະ: ${methodText}`,
          `ເບີໂທ: ${cleanPhone}`,
          `${usesBranch ? '' : 'ທີ່ຢູ່ຈັດສົ່ງ: '}${addrText}`,
        ]
          .filter(Boolean)
          .join('\n');

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

        // ບັນທຶກທີ່ຢູ່ໃໝ່ໄວ້ໃຊ້ຄັ້ງຕໍ່ໄປ (ສະເພາະຂົນສົ່ງທີ່ພິມທີ່ຢູ່ເອງ ແລະ ຍັງບໍ່ເຕັມ 5 ທີ່ຢູ່)
        if (!usesBranch && saveAddr && addressIsNew && savedAddrs.length < MAX_SAVED_ADDRESSES) {
          try {
            await apiPost('/api/customer-account/addresses', { label: '', address: address.trim() });
          } catch (addrErr) {
            console.error('ບັນທຶກທີ່ຢູ່ບໍ່ສຳເລັດ:', addrErr);
          }
        }

        navigate('/menu/chat');
      } else {
        showNotice(t('co.alertError') + (data && data.error ? `\n${data.error}` : ''));
        setConfirming(false);
      }
    } catch (err) {
      showNotice(t('co.alertConn'));
      setConfirming(false);
    }
  }

  return (
    <div className="customer-shell">
      <style>{css}</style>
      <TopBar />

      <div className={`checkout-page${step === 2 ? ' co-wide' : ''}`}>
        <div className="steps-bar">
          {STEP_KEYS.map((k, i) => (
            <div key={k} className={`step ${step === i + 1 ? 'active' : ''}`}>
              {i + 1}. {t(k)}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="step-panel">
            <h2>{t('co.items')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {item.image && (
                    <img src={`${API_BASE}${item.image}`} alt={item.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div>{item.name}</div>
                    <div style={{ color: '#999', fontSize: 13 }}>
                      {item.chosen_size ? `${t('common.size')} ${item.chosen_size} · ` : ''}x{item.quantity}
                    </div>
                  </div>
                  <div>{fmt(item.price * item.quantity)} {kip}</div>
                </div>
              ))}
            </div>
            <div className="checkout-total">
              <span>{t('co.subtotal')}</span>
              <span>{fmt(subtotal)} {kip}</span>
            </div>

            {shippingEnabled && (
              <>
                <div className="co-ship-row">
                  <span>{t('co.shipping')}</span>
                  {shippingFee > 0 ? (
                    <span>+{fmt(shippingFee)} {kip}</span>
                  ) : (
                    <span className="co-free">{t('co.shippingFree')}</span>
                  )}
                </div>
                {shipCfg.free_min > 0 &&
                  (shippingFee === 0 ? (
                    <div className="co-ship-hint ok">{t('co.freeReached')}</div>
                  ) : (
                    <div className="co-ship-hint">
                      {t('co.freeHint', { n: fmt(shipCfg.free_min - subtotal), kip })}
                      <div className="co-ship-bar">
                        <i style={{ width: `${Math.min(100, Math.round((subtotal / shipCfg.free_min) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
              </>
            )}

            <div className="co-sec-title">{t('co.chooseCarrier')}</div>
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
              <button className="back-btn" onClick={() => navigate('/menu/cart')}>{t('common.back')}</button>
              <button className="next-btn" onClick={validateStep1}>{t('co.next')}</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel">
            <div className="co-grid">
              {/* ===== ຝັ່ງຊ້າຍ: ຂໍ້ມູນ ===== */}
              <div className="co-col">
                <h2>{t('co.info')}</h2>
                <div className="co-stack">
                  <div className="co-card">
                    <div className="co-summary">
                      <CarrierLogo carrier={carrierObj} size={44} />
                      <div className="co-summary-name">{carrierObj.name}</div>
                      <button
                        type="button"
                        className="co-change"
                        aria-expanded={changingCarrier}
                        onClick={() => setChangingCarrier((v) => !v)}
                      >
                        {changingCarrier ? t('common.cancel') : t('co.change')}
                      </button>
                    </div>

                    {changingCarrier && (
                      <div className="co-carriers co-carriers-inline">
                        {CARRIERS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            className={`co-carrier${carrier === c.key ? ' selected' : ''}`}
                            onClick={() => pickCarrier(c.key)}
                          >
                            <CarrierLogo carrier={c} size={38} />
                            <span className="co-carrier-name">{c.name}</span>
                            <span className="co-radio" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="co-card">
                    <div className="co-label">{t('co.name')}</div>
                    <div className={`co-name${name ? '' : ' empty'}`}>
                      {name || t('co.noName')}
                    </div>

                    <div className="co-label">{t('co.phone')}</div>
                    <input
                      type="tel"
                      value={phone}
                      maxLength={16}
                      onChange={(e) => setPhone(e.target.value)}
                    />

                    {usesBranch ? (
                      <>
                        <div className="co-label">{t('co.pickupBranch')}</div>

                        <DropSelect
                          placeholder={t('co.selProvince')}
                          value={provinceId}
                          onChange={onProvinceChange}
                          options={provinces.map((p) => ({ value: p.province_id, label: p.province_name }))}
                        />

                        <DropSelect
                          placeholder={t('co.selDistrict')}
                          value={district}
                          disabled={!provinceId}
                          onChange={onDistrictChange}
                          options={districts.map((d) => ({ value: d, label: d }))}
                        />

                        <DropSelect
                          placeholder={t('co.selBranch')}
                          value={branchId}
                          disabled={!district}
                          onChange={setBranchId}
                          options={branches.map((b) => ({ value: b.branch_id, label: b.name }))}
                        />

                        {branchLoading && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)' }}>{t('common.loading')}</div>
                        )}

                        {selectedBranch && (
                          <div className="co-branch-info">
                            <div><b>{selectedBranch.name}</b></div>
                            {selectedBranch.address && <div>{selectedBranch.address}</div>}
                            {selectedBranch.phone && <div>{t('co.branchPhone', { n: selectedBranch.phone })}</div>}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="co-label">{t('co.shipAddress')}</div>
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
                          placeholder={t('co.shipAddress')}
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
                            {t('co.saveAddr')}
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== ຝັ່ງຂວາ: ຄູປອງ + ສະຫຼຸບຍອດ + ຊຳລະເງິນ ===== */}
              <div className="co-col">
                <h2>{t('co.payment')}</h2>

                <div className="co-label" style={{ marginBottom: 8 }}>{t('co.coupon')}</div>
                <div className="co-card" style={{ marginBottom: 12 }}>
                  {couponGroups.length === 0 ? (
                    <div style={{ fontSize: '0.88rem', color: 'var(--cust-text-muted)' }}>
                      {t('co.noCoupon')}
                    </div>
                  ) : (
                    couponGroups.map((g) => {
                      const c = g.rep;
                      const ok = subtotal >= c.min_order;
                      return (
                        <button
                          type="button"
                          key={g.key}
                          disabled={!ok}
                          className={`co-coupon${couponKey === g.key ? ' selected' : ''}`}
                          onClick={() => setCouponKey(couponKey === g.key ? null : g.key)}
                        >
                          <div>
                            <div className="co-coupon-name">
                              {c.name}
                              {g.count > 1 && <span className="co-coupon-count">×{g.count}</span>}
                            </div>
                            <div className="co-coupon-sub">
                              {ok
                                ? t('co.expires', { date: new Date(c.expires_at).toLocaleDateString('en-GB') })
                                : t('co.minOrder', { n: fmt(c.min_order), kip })}
                            </div>
                          </div>
                          {ok && <span className="co-coupon-save">-{fmt(calcDiscount(c, subtotal))}</span>}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* ສະຫຼຸບຍອດ: ສິນຄ້າ + ຄ່າສົ່ງ − ຄູປອງ = ຍອດສຸດທິ */}
                <div className="co-card co-sum">
                  <div className="co-sum-title">{t('co.summary')}</div>
                  <div className="co-sum-row">
                    <span>{t('co.subtotal')}</span>
                    <span>{fmt(subtotal)} {kip}</span>
                  </div>
                  {shippingEnabled && (
                    <div className="co-sum-row">
                      <span>{t('co.shipping')}</span>
                      {shippingFee > 0 ? (
                        <span>+{fmt(shippingFee)} {kip}</span>
                      ) : (
                        <span className="co-free">{t('co.shippingFree')}</span>
                      )}
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="co-sum-row disc">
                      <span>{t('co.couponDiscount')}</span>
                      <span>−{fmt(discount)} {kip}</span>
                    </div>
                  )}
                  <div className="co-sum-row net">
                    <span>{t('co.netTotal')}</span>
                    <span>{fmt(total)} {kip}</span>
                  </div>
                </div>

                <div className="co-pay">
                  <button
                    type="button"
                    className={`co-pay-opt${payMethod === 'transfer' ? ' selected' : ''}`}
                    onClick={() => setPayMethod('transfer')}
                  >
                    <IconTransfer /> {t('co.transfer')}
                  </button>
                  <button
                    type="button"
                    className={`co-pay-opt${payMethod === 'cod' ? ' selected' : ''}`}
                    onClick={() => setPayMethod('cod')}
                  >
                    <IconCash /> {t('co.cod')}
                  </button>
                </div>

                <div className="co-card">
                  {payMethod === 'transfer' ? (
                    <>
                      {qrImage && (
                        <div className="co-qr-wrap">
                          <img src={qrImage} alt={t('co.qrAlt')} className="payment-qr" />
                        </div>
                      )}
                      {qrMissing && <p>{t('co.qrMissing')}</p>}

                      <div className="co-amount">
                        <div className="co-amount-label">{t('co.amountTransfer')}</div>
                        <div className="co-amount-row">
                          <span className="co-amount-num">{fmt(total)} {kip}</span>
                          <button type="button" className="co-copy" onClick={copyAmount}>
                            {copied ? t('co.copied') : t('co.copy')}
                          </button>
                        </div>
                        <div className="co-amount-hint">{t('co.transferExact')}</div>
                      </div>

                      <label className="upload-label">{t('co.slipLabel')}</label>
                      {slipFile ? (
                        <div className="co-slip-row">
                          <a href={slipPreview} target="_blank" rel="noreferrer" title={t('co.slipZoom')}>
                            <img src={slipPreview} alt={t('co.slipAlt')} className="co-slip-thumb" />
                          </a>
                          <div className="co-slip-name">{slipFile.name}</div>
                          <button type="button" className="co-slip-remove" onClick={removeSlip}>{t('co.remove')}</button>
                        </div>
                      ) : (
                        <label className="co-upload">
                          <input type="file" accept="image/*" onChange={onSlipChange} />
                          <span>{t('co.pickSlip')}</span>
                        </label>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="co-cod">
                        <span className="co-cod-ic"><IconCash size={24} /></span>
                        <span>{t('co.codNote')}</span>
                      </div>
                      <div className="pay-amount-box" style={{ marginBottom: 0 }}>
                        <span>{t('co.amountPay')}</span>
                        <span>{fmt(total)} {kip}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ===== ແຖບຢືນຢັນ (ຕິດຂອບລຸ່ມຈໍ) ===== */}
            <div className="co-bar">
              <div className="co-bar-total">
                <span className="co-bar-label">{t('co.netTotal')}</span>
                <span className="co-bar-amount">{fmt(total)} {kip}</span>
              </div>
              <div className="co-bar-actions">
                <button type="button" className="co-bar-back" onClick={() => goStep(1)}>{t('common.back')}</button>
                <button type="button" className="co-bar-confirm" onClick={submitOrder} disabled={confirming}>
                  {confirming ? t('co.sending') : t('co.confirmOrder')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {noticeModal}
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