import { useEffect, useRef, useState } from 'react';
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
.co-coupon-name { font-weight: 700; font-size: 0.92rem; }
.co-coupon-sub { font-size: 0.78rem; color: var(--cust-text-muted); margin-top: 2px; }
.co-coupon-save { color: #b8862b; font-weight: 800; font-size: 0.9rem; white-space: nowrap; }

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

// ຄຳນວນສ່ວນລົດຄູປອງ (ໃຊ້ສະແດງຜົນເທົ່ານັ້ນ — backend ຄຳນວນຈິງຕອນສັ່ງຊື້ອີກຄັ້ງ)
function calcDiscount(c, subtotal) {
  if (!c || subtotal < c.min_order) return 0;
  let d = c.type === 'percent' ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.type === 'percent' && c.max_discount) d = Math.min(d, c.max_discount);
  return Math.min(d, subtotal);
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
          {options.length === 0 && <li className="empty">ບໍ່ມີຂໍ້ມູນ</li>}
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

  // ຄູປອງໃນກະເປົາຂອງລູກຄ້າ + ຄູປອງທີ່ເລືອກໃຊ້
  const [coupons, setCoupons] = useState([]);
  const [couponId, setCouponId] = useState(null);

  useEffect(() => {
    (async () => {
      const [cartRes, meRes, qrRes, addrRes, cpRes] = await Promise.all([
        apiGet('/api/cart'),
        apiGet('/api/customer-auth/me'),
        apiGet('/api/settings/payment-qr'),
        apiGet('/api/customer-account/addresses'),
        apiGet('/api/coupons/me'),
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

      if (cpRes.ok && Array.isArray(cpRes.data.coupons)) {
        setCoupons(cpRes.data.coupons);
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

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedCoupon = coupons.find((c) => c.id === couponId);
  const discount = selectedCoupon ? calcDiscount(selectedCoupon, subtotal) : 0;
  const total = subtotal - discount; // ຍອດທີ່ຕ້ອງຈ່າຍຈິງ

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
    if (usesBranch) {
      if (!provinceId) {
        alert('ກະລຸນາເລືອກແຂວງ');
        return;
      }
      if (!district) {
        alert('ກະລຸນາເລືອກເມືອງ');
        return;
      }
      if (!branchId) {
        alert('ກະລຸນາເລືອກສາຂາ');
        return;
      }
    } else if (!address.trim()) {
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
      formData.append('carrier', carrier);
      formData.append('payment_method', payMethod);
      if (couponId) formData.append('user_coupon_id', couponId);
      if (usesBranch) {
        formData.append('branch_id', branchId);
      } else {
        formData.append('customer_address', address.trim());
      }
      if (payMethod === 'transfer') formData.append('slip', slipFile);

      const { ok, data } = await apiUpload('/api/orders', formData);

      if (ok) {
        // backend ສົ່ງທີ່ຢູ່ (ທີ່ປະກອບຈາກສາຂາແລ້ວ) ກັບມາ
        const addrText = data.address || address.trim();
        const itemLines = items
          .map((i) => `- ${i.name}${i.chosen_size ? ` (ໄຊສ໌ ${i.chosen_size})` : ''} x${i.quantity} = ${i.price * i.quantity} ກີບ`)
          .join('\n');
        const methodText = payMethod === 'cod' ? 'ເກັບເງິນປາຍທາງ (COD)' : 'ໂອນເງິນ';
        const orderMessage =
          `ສັ່ງຊື້ໃໝ່:\n${itemLines}\n` +
          (discount > 0 ? `ຄູປອງ: ${selectedCoupon.name} (-${discount} ກີບ)\n` : '') +
          `ລວມ: ${total} ກີບ\n` +
          `ຂົນສົ່ງ: ${carrierObj.name}\nວິທີຊຳລະ: ${methodText}\n` +
          `ເບີໂທ: ${cleanPhone}\n${usesBranch ? '' : 'ທີ່ຢູ່ຈັດສົ່ງ: '}${addrText}`;

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
              <span>{fmt(subtotal)} ກີບ</span>
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

                    {usesBranch ? (
                      <>
                        <div className="co-label">ສາຂາທີ່ຈະໄປຮັບສິນຄ້າ</div>

                        <DropSelect
                          placeholder="ເລືອກແຂວງ"
                          value={provinceId}
                          onChange={onProvinceChange}
                          options={provinces.map((p) => ({ value: p.province_id, label: p.province_name }))}
                        />

                        <DropSelect
                          placeholder="ເລືອກເມືອງ"
                          value={district}
                          disabled={!provinceId}
                          onChange={onDistrictChange}
                          options={districts.map((d) => ({ value: d, label: d }))}
                        />

                        <DropSelect
                          placeholder="ເລືອກສາຂາ"
                          value={branchId}
                          disabled={!district}
                          onChange={setBranchId}
                          options={branches.map((b) => ({ value: b.branch_id, label: b.name }))}
                        />

                        {branchLoading && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--cust-text-muted)' }}>ກຳລັງໂຫລດ...</div>
                        )}

                        {selectedBranch && (
                          <div className="co-branch-info">
                            <div><b>{selectedBranch.name}</b></div>
                            {selectedBranch.address && <div>{selectedBranch.address}</div>}
                            {selectedBranch.phone && <div>ເບີສາຂາ: {selectedBranch.phone}</div>}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== ຝັ່ງຂວາ: ຄູປອງ + ຊຳລະເງິນ ===== */}
              <div className="co-col">
                <h2>ຊຳລະເງິນ</h2>

                <div className="co-label" style={{ marginBottom: 8 }}>ຄູປອງສ່ວນລົດ</div>
                <div className="co-card" style={{ marginBottom: 12 }}>
                  {coupons.length === 0 ? (
                    <div style={{ fontSize: '0.88rem', color: 'var(--cust-text-muted)' }}>
                      ທ່ານຍັງບໍ່ມີຄູປອງ · ແລກແຕ້ມເປັນຄູປອງໄດ້ທີ່ໜ້າບັນຊີ
                    </div>
                  ) : (
                    coupons.map((c) => {
                      const ok = subtotal >= c.min_order;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          disabled={!ok}
                          className={`co-coupon${couponId === c.id ? ' selected' : ''}`}
                          onClick={() => setCouponId(couponId === c.id ? null : c.id)}
                        >
                          <div>
                            <div className="co-coupon-name">{c.name}</div>
                            <div className="co-coupon-sub">
                              {ok
                                ? `ໝົດອາຍຸ ${new Date(c.expires_at).toLocaleDateString('en-GB')}`
                                : `ຕ້ອງສັ່ງຂັ້ນຕ່ຳ ${fmt(c.min_order)} ກີບ`}
                            </div>
                          </div>
                          {ok && <span className="co-coupon-save">-{fmt(calcDiscount(c, subtotal))}</span>}
                        </button>
                      );
                    })
                  )}
                </div>

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
                <span className="co-bar-label">
                  {discount > 0 ? `ລວມ ${fmt(subtotal)} − ຄູປອງ ${fmt(discount)}` : 'ລວມທັງໝົດ'}
                </span>
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