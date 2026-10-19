import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export const LANGS = [
  { code: 'lo', short: 'ລາວ', name: 'ລາວ', sub: 'Lao', locale: 'lo-LA' },
  { code: 'th', short: 'ไทย', name: 'ไทย', sub: 'Thai', locale: 'th-TH' },
  { code: 'en', short: 'EN', name: 'English', sub: 'English (US)', locale: 'en-GB' },
];

const KEY = 'app_lang';
const DEFAULT_LANG = 'lo';

// ★ ເພີ່ມຄຳແປຢູ່ບ່ອນນີ້ — ຄີດຽວກັນໃນທັງ 3 ພາສາ
const dict = {
  lo: {
    'menu.products': 'ສິນຄ້າ',
    'menu.pos': 'POS ໜ້າຮ້ານ',
    'menu.orders': 'ຄຳສັ່ງຊື້',
    'menu.customers': 'ລູກຄ້າ',
    'menu.coupons': 'ຄູປອງ',
    'menu.banners': 'ແບນເນີ',
    'menu.qr': 'QR Code',
    'menu.chat': 'ແຊັດ',
    'menu.reports': 'ລາຍງານຍອດຂາຍ',
    'menu.staff': 'ພະນັກງານ',

    'admin.title': 'ຈັດການຮ້ານ',
    'admin.hello': 'ສະບາຍດີ, {name} ({role})',
    'role.admin': 'ແອດມິນ',
    'role.staff': 'ພະນັກງານ',
    'auth.logout': 'ອອກຈາກລະບົບ',

    'lang.choose': 'ເລືອກພາສາ',

    'common.all': 'ທັງໝົດ',
    'common.cancel': 'ຍົກເລີກ',
    'common.confirm': 'ຢືນຢັນ',
    'common.search': 'ຄົ້ນຫາ...',
    'common.today': 'ມື້ນີ້',
    'common.yesterday': 'ມື້ວານ',
    'common.found': 'ພົບ {n} ລາຍການ',
    'common.kip': 'ກີບ',

    // ---- ຄຳກາງ ຝັ່ງລູກຄ້າ ----
    'common.addToCart': 'ເພີ່ມລົງກະຕ່າ',
    'common.buyNow': 'ຊື້ເລີຍ',
    'common.soldOut': 'ສິນຄ້າໝົດ',
    'common.loading': 'ກຳລັງໂຫລດ...',
    'common.retry': 'ລອງໃໝ່',
    'common.back': 'ກັບຄືນ',
    'common.quantity': 'ຈຳນວນ',
    'common.size': 'ໄຊສ໌',
    'common.color': 'ສີ',
    'common.category': 'ໝວດ',
    'common.favorite': 'ຖືກໃຈ',
    'common.addedToCart': 'ເພີ່ມລົງກະຕ່າແລ້ວ',
    'common.addFail': 'ເພີ່ມລົງກະຕ່າບໍ່ສຳເລັດ',
    'common.stockLeft': 'ເຫຼືອ: {n} ອັນ',
    'badge.bestseller': 'ສິນຄ້າຂາຍດີ',
    'badge.promo': 'ຈັດໂປຣ',
  },

  th: {
    'menu.products': 'สินค้า',
    'menu.pos': 'POS หน้าร้าน',
    'menu.orders': 'คำสั่งซื้อ',
    'menu.customers': 'ลูกค้า',
    'menu.coupons': 'คูปอง',
    'menu.banners': 'แบนเนอร์',
    'menu.qr': 'QR Code',
    'menu.chat': 'แชต',
    'menu.reports': 'รายงานยอดขาย',
    'menu.staff': 'พนักงาน',

    'admin.title': 'จัดการร้าน',
    'admin.hello': 'สวัสดี, {name} ({role})',
    'role.admin': 'แอดมิน',
    'role.staff': 'พนักงาน',
    'auth.logout': 'ออกจากระบบ',

    'lang.choose': 'เลือกภาษา',

    'common.all': 'ทั้งหมด',
    'common.cancel': 'ยกเลิก',
    'common.confirm': 'ยืนยัน',
    'common.search': 'ค้นหา...',
    'common.today': 'วันนี้',
    'common.yesterday': 'เมื่อวาน',
    'common.found': 'พบ {n} รายการ',
    'common.kip': 'กีบ',

    'common.addToCart': 'เพิ่มลงตะกร้า',
    'common.buyNow': 'ซื้อเลย',
    'common.soldOut': 'สินค้าหมด',
    'common.loading': 'กำลังโหลด...',
    'common.retry': 'ลองใหม่',
    'common.back': 'กลับ',
    'common.quantity': 'จำนวน',
    'common.size': 'ไซซ์',
    'common.color': 'สี',
    'common.category': 'หมวด',
    'common.favorite': 'ถูกใจ',
    'common.addedToCart': 'เพิ่มลงตะกร้าแล้ว',
    'common.addFail': 'เพิ่มลงตะกร้าไม่สำเร็จ',
    'common.stockLeft': 'เหลือ: {n} ชิ้น',
    'badge.bestseller': 'สินค้าขายดี',
    'badge.promo': 'โปรโมชั่น',
  },

  en: {
    'menu.products': 'Products',
    'menu.pos': 'In-store POS',
    'menu.orders': 'Orders',
    'menu.customers': 'Customers',
    'menu.coupons': 'Coupons',
    'menu.banners': 'Banners',
    'menu.qr': 'QR Code',
    'menu.chat': 'Chat',
    'menu.reports': 'Sales report',
    'menu.staff': 'Staff',

    'admin.title': 'Shop management',
    'admin.hello': 'Hello, {name} ({role})',
    'role.admin': 'Admin',
    'role.staff': 'Staff',
    'auth.logout': 'Log out',

    'lang.choose': 'Choose language',

    'common.all': 'All',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.search': 'Search...',
    'common.today': 'Today',
    'common.yesterday': 'Yesterday',
    'common.found': '{n} found',
    'common.kip': 'LAK',

    'common.addToCart': 'Add to cart',
    'common.buyNow': 'Buy now',
    'common.soldOut': 'Sold out',
    'common.loading': 'Loading...',
    'common.retry': 'Try again',
    'common.back': 'Back',
    'common.quantity': 'Quantity',
    'common.size': 'Size',
    'common.color': 'Color',
    'common.category': 'Category',
    'common.favorite': 'Favorite',
    'common.addedToCart': 'Added to cart',
    'common.addFail': "Couldn't add to cart",
    'common.stockLeft': '{n} left',
    'badge.bestseller': 'Best seller',
    'badge.promo': 'Sale',
  },
};

function readSaved() {
  try {
    const v = localStorage.getItem(KEY);
    return LANGS.some((l) => l.code === v) ? v : DEFAULT_LANG;
  } catch (e) {
    return DEFAULT_LANG;
  }
}

const LangContext = createContext({
  lang: DEFAULT_LANG,
  locale: 'lo-LA',
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(readSaved);

  const setLang = useCallback((code) => {
    setLangState(code);
    try {
      localStorage.setItem(KEY, code);
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY && LANGS.some((l) => l.code === e.newValue)) setLangState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => {
    const locale = LANGS.find((l) => l.code === lang).locale;
    // ຖ້າບໍ່ມີຄຳແປ → ໃຊ້ພາສາລາວ → ຖ້າບໍ່ມີອີກ ສະແດງຄີ (ບໍ່ໃຫ້ໜ້າຈໍແຕກ)
    const t = (key, vars) => {
      let s = dict[lang][key] ?? dict.lo[key] ?? key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          s = s.split(`{${k}}`).join(vars[k]);
        });
      }
      return s;
    };
    return { lang, locale, setLang, t };
  }, [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

// ---------- ປຸ່ມເລືອກພາສາແບບ popup ----------
const SW_CSS = `
.lsw{position:relative;display:inline-block}
.lsw-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:6px 12px;font-family:inherit;font-size:.84rem;font-weight:700;cursor:pointer;white-space:nowrap;transition:background-color .15s,border-color .15s}
.lsw-btn:hover{background:#f3f4f6;border-color:#9ca3af}
.lsw-btn[aria-expanded="true"]{border-color:#2563eb;color:#1d4ed8}
.lsw-btn svg{flex:none}
.lsw-chev{transition:transform .15s}
.lsw-btn[aria-expanded="true"] .lsw-chev{transform:rotate(180deg)}
.lsw-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:4000;min-width:220px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 32px rgba(16,24,40,.18);padding:6px;margin:0;list-style:none}
.lsw-title{padding:8px 12px 6px;font-size:.78rem;font-weight:700;color:#6b7280}
.lsw-item{position:relative;display:flex;align-items:center;gap:12px;width:100%;border:0;background:transparent;border-radius:10px;padding:10px 12px 10px 16px;font-family:inherit;text-align:left;cursor:pointer;color:#1f2937}
.lsw-item:hover,.lsw-item:focus-visible{background:#f3f4f6;outline:none}
.lsw-item.on{background:#eff6ff}
.lsw-item.on::before{content:'';position:absolute;left:4px;top:10px;bottom:10px;width:3px;border-radius:3px;background:#2563eb}
.lsw-short{flex:none;min-width:34px;font-size:.8rem;font-weight:700;color:#6b7280}
.lsw-item.on .lsw-short{color:#1d4ed8}
.lsw-name{display:block;font-size:.95rem;font-weight:700;line-height:1.25}
.lsw-sub{display:block;font-size:.78rem;color:#6b7280;line-height:1.25}
@media (max-width:640px){.lsw-menu{min-width:200px}}
`;

export function LangSwitcher({ style }) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(code) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div className="lsw" ref={wrapRef} style={style}>
      <style>{SW_CSS}</style>
      <button
        type="button"
        className="lsw-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.choose')}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18 M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" />
        </svg>
        {current.short}
        <svg className="lsw-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="lsw-menu" role="listbox" aria-label={t('lang.choose')}>
          <li className="lsw-title" aria-hidden="true">{t('lang.choose')}</li>
          {LANGS.map((l) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                className={`lsw-item${l.code === lang ? ' on' : ''}`}
                onClick={() => pick(l.code)}
              >
                <span className="lsw-short">{l.short}</span>
                <span>
                  <span className="lsw-name">{l.name}</span>
                  <span className="lsw-sub">{l.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}