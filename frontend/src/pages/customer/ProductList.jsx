import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar.jsx';
import HomeHero from '../../components/HomeHero.jsx';
import CategoryBar from '../../components/CategoryBar.jsx';
import { CartProvider, useCart } from '../../context/CartContext.jsx';
import { API_BASE, apiGet, apiPost, apiDelete } from '../../api';
import { formatPrice } from '../../components/ProductBadges.jsx';
import { usePageT } from '../../useT.js';
import baseDict from '../../locales/cust-home.js';
import '../../styles/home.css';

/* ตั้งค่าร้าน — แก้ตรงนี้ที่เดียว (ปล่อยว่าง = ไม่แสดง) */
const SHOP = {
  whatsapp: '',   // เช่น '8562012345678'
  facebook: '',   // เช่น 'https://facebook.com/poloshop'
  hours: '',      // เช่น '08:00 - 20:00'
  address: '',
};
const ROUTES = { home: '/menu', fav: '/menu/favorites', cart: '/menu/cart', account: '/menu/account' };

const LOW_STOCK = 10;        // เหลือไม่เกินนี้ = แสดง "เหลือ n ชิ้น" สีส้ม
const SHOW_BEST_TAG = false; // true = แสดงป้าย "ขายดี" บนรูปสินค้า
const BEST_SOLD = 50;        // ขายเกินนี้ = ป้ายขายดี (ใช้เมื่อ SHOW_BEST_TAG = true)
const PAGE_SIZE = 12;        // จำนวนสินค้าต่อการโหลด
const MAX_SIZE_CHIPS = 4;    // ไซส์ที่แสดงบนการ์ด ที่เหลือเป็น +n

const extraDict = {
  lo: {
    'pc.reset': 'ລ້າງຕົວກອງ',
    'pc.count': '{n} ລາຍການ',
    'pc.best': 'ຂາຍດີ',
    'pc.new': 'ໃໝ່',
    'pc.trust1': 'ສົ່ງທົ່ວລາວ',
    'pc.trust2': 'ຈ່າຍປາຍທາງໄດ້',
    'pc.trust3': 'ສິນຄ້າແທ້ 100%',
    'pc.loadMore': 'ໂຫຼດເພີ່ມ ({n})',
    'pc.navHome': 'ໜ້າຫຼັກ',
    'pc.navCat': 'ໝວດ',
    'pc.navFav': 'ຖືກໃຈ',
    'pc.navCart': 'ກະຕ່າ',
    'pc.navAccount': 'ບັນຊີ',
    'pc.contact': 'ຕິດຕໍ່ຮ້ານ',
    'pc.hours': 'ເວລາເປີດ',
    'pc.address': 'ທີ່ຢູ່',
    'pc.top': 'ກັບຂຶ້ນເທິງ',
  },
  th: {
    'pc.reset': 'ล้างตัวกรอง',
    'pc.count': '{n} รายการ',
    'pc.best': 'ขายดี',
    'pc.new': 'ใหม่',
    'pc.trust1': 'ส่งทั่วลาว',
    'pc.trust2': 'ชำระปลายทางได้',
    'pc.trust3': 'สินค้าแท้ 100%',
    'pc.loadMore': 'โหลดเพิ่ม ({n})',
    'pc.navHome': 'หน้าแรก',
    'pc.navCat': 'หมวด',
    'pc.navFav': 'ถูกใจ',
    'pc.navCart': 'ตะกร้า',
    'pc.navAccount': 'บัญชี',
    'pc.contact': 'ติดต่อร้าน',
    'pc.hours': 'เวลาทำการ',
    'pc.address': 'ที่อยู่',
    'pc.top': 'กลับขึ้นบน',
  },
  en: {
    'pc.reset': 'Clear filters',
    'pc.count': '{n} items',
    'pc.best': 'Best seller',
    'pc.new': 'New',
    'pc.trust1': 'Nationwide delivery',
    'pc.trust2': 'Cash on delivery',
    'pc.trust3': '100% authentic',
    'pc.loadMore': 'Load more ({n})',
    'pc.navHome': 'Home',
    'pc.navCat': 'Categories',
    'pc.navFav': 'Favorites',
    'pc.navCart': 'Cart',
    'pc.navAccount': 'Account',
    'pc.contact': 'Contact',
    'pc.hours': 'Hours',
    'pc.address': 'Address',
    'pc.top': 'Back to top',
  },
};
const dict = {
  lo: { ...(baseDict.lo || {}), ...extraDict.lo },
  th: { ...(baseDict.th || {}), ...extraDict.th },
  en: { ...(baseDict.en || {}), ...extraDict.en },
};

const extraCss = `
/* =====================================================
   แถบความมั่นใจ: 3 การ์ดเท่ากัน เต็มความกว้างกรอบเนื้อหา
   ===================================================== */
.pc-trust {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 0 24px;
}
.pc-trust-item {
  display: flex; align-items: center; justify-content: center; gap: 12px; min-width: 0;
  padding: 14px 16px; border-radius: 16px;
  background: var(--cust-surface, #fff);
  border: 1px solid var(--cust-border, #eceae3);
  box-shadow: 0 1px 2px rgba(60, 45, 10, 0.04);
  color: var(--cust-text, #1f2937); font-size: 1rem; font-weight: 700; line-height: 1.3;
}
.pc-trust-ic {
  flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(201, 162, 39, 0.14); color: var(--cust-gold-text, #b8862b);
}
.pc-trust-item span { min-width: 0; }
@media (max-width: 900px) {
  .pc-trust-item { font-size: 0.9rem; gap: 10px; padding: 12px 10px; }
  .pc-trust-ic { width: 40px; height: 40px; }
}
@media (max-width: 560px) {
  .pc-trust { gap: 8px; margin-bottom: 20px; }
  .pc-trust-item { flex-direction: column; gap: 8px; padding: 12px 6px; text-align: center; font-size: 0.78rem; }
  .pc-trust-ic { width: 40px; height: 40px; }
}
:root[data-theme='dark'] .pc-trust-item { background: #1c1c20; border-color: rgba(255, 255, 255, 0.08); color: #e4e4e7; box-shadow: none; }
:root[data-theme='dark'] .pc-trust-ic { background: rgba(201, 162, 39, 0.18); color: #e8c25a; }

/* จำนวนรายการ: ต่อท้ายหัวข้อ */
.hm-section-title .hm-count {
  margin-left: 8px; font-size: 0.8rem; font-weight: 500;
  color: var(--cust-text-muted, #6b7280); white-space: nowrap;
}
.pc-gridgap { height: 16px; }

/* ตารางสินค้า: 2 / 3 / 4 คอลัมน์ */
.pc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
@media (min-width: 640px)  { .pc-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; } }
@media (min-width: 1024px) { .pc-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

/* การ์ดสินค้า */
.pc-card {
  position: relative; display: flex; flex-direction: column; min-width: 0;
  background: var(--cust-surface, #fff);
  border: 1px solid var(--cust-border, #eceae3);
  border-radius: 16px; cursor: pointer; outline: none; overflow: hidden;
  box-shadow: 0 1px 2px rgba(60, 45, 10, 0.04);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease, background-color .35s ease;
}
.pc-card:focus-visible { box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.4); }
@media (hover: hover) {
  .pc-card:hover {
    transform: translateY(-3px); border-color: rgba(201, 162, 39, 0.55);
    box-shadow: 0 12px 28px rgba(60, 45, 10, 0.12);
  }
  .pc-card:hover .pc-img img { transform: scale(1.04); }
}

/* รูป 4:5 */
.pc-img { position: relative; aspect-ratio: 4 / 5; overflow: hidden; background: var(--cust-surface-soft, #f6f5f1); }
.pc-img img {
  position: absolute; inset: 12px; width: calc(100% - 24px); height: calc(100% - 24px);
  object-fit: contain; display: block; mix-blend-mode: multiply;
  transition: transform .45s cubic-bezier(.2, .7, .2, 1);
}
.pc-noimg { position: absolute; inset: 0; display: grid; place-items: center; color: #c4c4c0; }

/* ป้ายมุมซ้ายบน (1 ป้าย) */
.pc-tag {
  position: absolute; top: 8px; left: 8px; z-index: 2; pointer-events: none;
  height: 22px; padding: 0 9px; border-radius: 999px; display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 700; line-height: 1; color: #fff; background: #1f2937;
}
.pc-tag.sale { background: #dc2626; }
.pc-tag.best { background: #b8862b; }
.pc-tag.new { background: #1f2937; }

.pc-fav {
  position: absolute; top: 8px; right: 8px; z-index: 3; width: 32px; height: 32px;
  border-radius: 50%; border: 0; padding: 0; cursor: pointer;
  background: rgba(255, 255, 255, 0.95); box-shadow: 0 1px 6px rgba(0, 0, 0, 0.14);
  display: grid; place-items: center; transition: transform .15s ease;
}
.pc-fav:hover { transform: scale(1.1); }
.pc-fav:active { transform: scale(0.92); }
.pc-soldout {
  position: absolute; inset: 0; z-index: 2; display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.62); pointer-events: none;
}
.pc-soldout span { padding: 6px 16px; border-radius: 999px; background: #111827; color: #fff; font-weight: 700; font-size: 0.82rem; }

/* เนื้อหา */
.pc-body { display: flex; flex-direction: column; flex: 1; gap: 4px; padding: 12px; min-width: 0; }
.pc-name {
  margin: 0; font-size: 14px; font-weight: 700; line-height: 1.35;
  color: var(--cust-text, #1f2937); overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere;
}

/* ดาวรีวิว: เรียงดาว 5 ดวง เติมสีตามคะแนน */
.pc-rate { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; line-height: 16px; color: var(--cust-text-muted, #6b7280); }
.pc-stars { position: relative; display: inline-flex; flex: 0 0 auto; }
.pc-stars-base, .pc-stars-fill { display: inline-flex; white-space: nowrap; }
.pc-stars-base svg { fill: #dcd9cf; }
.pc-stars-fill { position: absolute; left: 0; top: 0; overflow: hidden; }
.pc-stars-fill svg { flex: 0 0 auto; fill: var(--gold); }

/* ไซส์: ชิปเล็ก */
.pc-meta { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 0; }
.pc-sizes { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; max-height: 22px; overflow: hidden; }
.pc-size {
  height: 22px; min-width: 24px; padding: 0 7px; box-sizing: border-box; border-radius: 6px;
  border: 1px solid var(--cust-border, #e0ddd2); color: var(--cust-text, #1f2937);
  font-size: 11px; font-weight: 600; line-height: 20px; text-align: center; white-space: nowrap;
}
.pc-size.off { opacity: 0.4; text-decoration: line-through; font-weight: 500; }
.pc-size.more { border-style: dashed; color: var(--cust-text-muted, #6b7280); }
.pc-color { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 12px; line-height: 16px; color: var(--cust-text, #1f2937); }
.pc-color-dots { display: inline-flex; flex: 0 0 auto; }
.pc-color-dot { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.18); box-sizing: border-box; }
.pc-color-dot + .pc-color-dot { margin-left: -4px; }
.pc-color-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ส่วนล่าง: ราคา + ยอดขาย + ปุ่ม (ชิดล่างเสมอ) */
.pc-bottom { margin-top: auto; padding-top: 8px; display: flex; flex-direction: column; gap: 2px; }
.pc-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 8px; min-width: 0; }
.pc-now { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.25; color: var(--cust-gold-text, #b8862b); white-space: nowrap; }
.pc-now small { font-size: 11px; font-weight: 700; margin-left: 3px; }
.pc-now.sale { color: #dc2626; }
.pc-was { font-size: 12px; color: #9ca3af; text-decoration: line-through; white-space: nowrap; }

/* ยอดขายใต้ราคา (ซ้าย) + ในตะกร้า (ขวา) */
.pc-soldline {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  min-height: 16px; font-size: 12px; line-height: 16px; white-space: nowrap;
  color: var(--cust-text-muted, #6b7280);
}
.pc-soldline .incart { margin-left: auto; color: var(--cust-gold-text, #b8862b); font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.pc-stocknote { font-size: 12px; line-height: 16px; font-weight: 600; }
.pc-stocknote.low { color: #c2410c; }
.pc-stocknote.out { color: #9ca3af; }
.pc-gap { height: 6px; }

.pc-actions { display: flex; gap: 8px; }
.pc-buy {
  flex: 1; min-width: 0; height: 44px; border: 0; border-radius: 10px; cursor: pointer;
  background: var(--gold); color: #fff; font-weight: 800; font-size: 0.9rem;
  transition: filter .15s ease, transform .15s ease;
}
.pc-buy:hover:not(:disabled) { filter: brightness(1.06); }
.pc-buy:active:not(:disabled) { transform: scale(0.98); }
.pc-buy:disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
.pc-cart {
  flex: 0 0 44px; width: 44px; height: 44px; padding: 0; border-radius: 10px;
  border: 1.5px solid var(--gold); background: transparent; color: var(--cust-gold-text, #b8862b);
  display: grid; place-items: center; cursor: pointer;
  transition: background-color .15s ease, transform .15s ease;
}
.pc-cart:hover:not(:disabled) { background: rgba(201, 162, 39, 0.1); }
.pc-cart:active:not(:disabled) { transform: scale(0.94); }
.pc-cart:disabled { opacity: 0.4; cursor: not-allowed; border-color: var(--cust-border, #e0ddd2); }

/* โครงตอนโหลด */
.pc-skel-card { pointer-events: none; cursor: default; }
.pc-skel {
  background: linear-gradient(90deg, var(--cust-surface-soft, #f3f2ee) 25%, rgba(128, 128, 128, 0.14) 37%, var(--cust-surface-soft, #f3f2ee) 63%);
  background-size: 400% 100%; animation: pc-sh 1.4s ease infinite;
}
.pc-skel.line { height: 14px; border-radius: 6px; }
.pc-skel.btn { height: 44px; border-radius: 10px; }
@keyframes pc-sh { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

/* ไม่พบสินค้า */
.pc-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 16px; text-align: center; color: var(--cust-text-muted, #6b7280); }
.pc-empty-ic { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; background: var(--cust-surface-soft, #f6f5f1); color: #b5b5ae; }
.pc-empty p { margin: 0; font-size: 0.95rem; }
.pc-empty button { height: 40px; padding: 0 22px; border-radius: 999px; border: 1.5px solid var(--gold); background: transparent; color: var(--cust-gold-text, #b8862b); font-weight: 700; cursor: pointer; }
.pc-empty button:hover { background: rgba(201, 162, 39, 0.12); }

/* โหลดเพิ่ม */
.pc-more { display: flex; justify-content: center; margin-top: 24px; }
.pc-more button { height: 44px; padding: 0 28px; border-radius: 999px; border: 1.5px solid var(--gold); background: transparent; color: var(--cust-gold-text, #b8862b); font-weight: 700; font-size: 0.9rem; cursor: pointer; }
.pc-more button:hover { background: rgba(201, 162, 39, 0.12); }

/* ส่วนท้าย (ติดต่อร้าน) — แสดงเมื่อใส่ข้อมูลใน SHOP */
.pc-footer { margin-top: 32px; padding: 24px 16px; border-top: 1px solid var(--cust-border, #eceae3); display: grid; gap: 16px; font-size: 0.85rem; color: var(--cust-text-muted, #6b7280); }
.pc-footer h4 { margin: 0 0 6px; font-size: 0.85rem; color: var(--cust-text, #1f2937); }
.pc-footer p { margin: 0; line-height: 1.5; }
.pc-footer a { color: var(--cust-gold-text, #b8862b); font-weight: 600; text-decoration: none; margin-right: 12px; }
@media (min-width: 768px) { .pc-footer { grid-template-columns: repeat(2, 1fr); } }

/* ปุ่มลอย */
.pc-fabs { position: fixed; right: 16px; bottom: 24px; z-index: 80; display: flex; flex-direction: column; gap: 12px; align-items: center; }
.pc-fab { width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer; padding: 0; display: grid; place-items: center; text-decoration: none; color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22); }
.pc-fab.wa { background: #25d366; }
.pc-fab.top { background: #fff; color: #374151; border: 1px solid var(--cust-border, #e5e7eb); }

/* แถบเมนูล่าง (มือถือ) */
.pc-nav {
  display: none; position: fixed; left: 0; right: 0; bottom: 0; z-index: 90;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--cust-surface, #fff); border-top: 1px solid var(--cust-border, #eceae3);
}
.pc-nav-in { display: grid; grid-template-columns: repeat(5, 1fr); height: 56px; }
.pc-nav button {
  position: relative; border: 0; background: transparent; padding: 0; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-size: 11px; font-weight: 600; color: var(--cust-text-muted, #6b7280);
}
.pc-nav button.active { color: var(--cust-gold-text, #b8862b); }
.pc-nav-badge {
  position: absolute; top: 4px; left: calc(50% + 6px); min-width: 16px; height: 16px; padding: 0 4px;
  box-sizing: border-box; border-radius: 999px; background: #dc2626; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
}
@media (max-width: 768px) {
  .pc-nav { display: block; }
  .pc-page { padding-bottom: 72px; }
  .pc-fabs { right: 12px; bottom: 68px; }
}

/* toast */
.pc-toast {
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 300;
  display: inline-flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px);
  padding: 10px 18px; border-radius: 999px; background: #1f2937; color: #fff;
  font-size: 0.9rem; font-weight: 600; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
}

/* โหมดมืด */
:root[data-theme='dark'] .pc-card { background: linear-gradient(160deg, #1f1f24 0%, #151518 100%); border-color: rgba(255, 255, 255, 0.07); box-shadow: none; }
@media (hover: hover) {
  :root[data-theme='dark'] .pc-card:hover { border-color: rgba(201, 162, 39, 0.45); box-shadow: 0 16px 34px rgba(0, 0, 0, 0.6), 0 0 22px rgba(201, 162, 39, 0.15); }
}
:root[data-theme='dark'] .pc-img { background: #f1efe9; }
:root[data-theme='dark'] .pc-fav { background: rgba(25, 25, 29, 0.85); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); }
:root[data-theme='dark'] .pc-soldout { background: rgba(13, 13, 15, 0.66); }
:root[data-theme='dark'] .pc-soldout span { background: #2a2a30; color: #d4d4d8; }
:root[data-theme='dark'] .pc-was { color: #7d7d86; }
:root[data-theme='dark'] .pc-now.sale { color: #f87171; }
:root[data-theme='dark'] .pc-stocknote.low { color: #fdba74; }
:root[data-theme='dark'] .pc-soldline .incart { color: #e8c25a; }
:root[data-theme='dark'] .pc-stars-base svg { fill: #3a3a42; }
:root[data-theme='dark'] .pc-size { border-color: rgba(255, 255, 255, 0.14); color: #e4e4e7; }
:root[data-theme='dark'] .pc-buy { background: linear-gradient(135deg, #f0d77a, #c9a227); color: #1c1505; box-shadow: 0 4px 14px rgba(201, 162, 39, 0.3); }
:root[data-theme='dark'] .pc-buy:disabled { background: #2a2a30; color: #6b6b74; box-shadow: none; }
:root[data-theme='dark'] .pc-cart { border-color: rgba(201, 162, 39, 0.5); color: #e8c25a; }
:root[data-theme='dark'] .pc-cart:hover:not(:disabled) { background: rgba(201, 162, 39, 0.15); }
:root[data-theme='dark'] .pc-skel { background: linear-gradient(90deg, #232328 25%, #2c2c32 37%, #232328 63%); background-size: 400% 100%; }
:root[data-theme='dark'] .pc-empty-ic { background: #232328; color: #6b6b74; }
:root[data-theme='dark'] .pc-toast { background: #232328; border: 1px solid rgba(201, 162, 39, 0.4); color: #e8c25a; }
:root[data-theme='dark'] .pc-nav { background: #19191d; border-color: rgba(255, 255, 255, 0.08); }
:root[data-theme='dark'] .pc-fab.top { background: #232328; color: #e4e4e7; border-color: rgba(255, 255, 255, 0.1); }

/* จอเล็ก */
@media (max-width: 560px) {
  .pc-card { border-radius: 14px; }
  .pc-body { padding: 10px; }
  .pc-now { font-size: 17px; }
  .pc-buy { font-size: 0.86rem; }
}
@media (prefers-reduced-motion: reduce) {
  .pc-card, .pc-img img, .pc-buy, .pc-cart, .pc-fav { transition: none !important; }
  .pc-skel { animation: none; }
}

/* ป๊อปอัปเลือกไซส์ (เดิม) */
.sz-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
.sz-box { width: 100%; max-width: 380px; background: #fff; border-radius: 16px; padding: 18px 18px 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25); max-height: calc(100vh - 32px); overflow-y: auto; }
.sz-head { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.sz-head img { width: 64px; height: 64px; border-radius: 10px; object-fit: cover; background: #f4f4f2; flex: 0 0 auto; }
.sz-name { font-size: 0.98rem; font-weight: 700; color: var(--cust-text, #1f2937); line-height: 1.3; }
.sz-sub { font-size: 0.8rem; color: var(--cust-text-muted, #6b7280); margin-top: 3px; }
.sz-title { font-size: 0.9rem; font-weight: 600; margin: 4px 0 8px; color: var(--cust-text, #1f2937); }
.sz-sizes { display: flex; flex-wrap: wrap; gap: 8px; }
.sz-size { min-width: 52px; padding: 9px 14px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; color: var(--cust-text, #1f2937); font-weight: 600; font-size: 0.9rem; cursor: pointer; }
.sz-size.active { background: var(--gold); border-color: var(--gold); color: #fff; }
.sz-sizes.err .sz-size:not(.active) { border-color: #dc2626; }
.sz-err { color: #dc2626; font-size: 0.82rem; margin-top: 8px; }
.sz-qty-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; }
.sz-qty { display: flex; align-items: center; gap: 12px; }
.sz-qty button { width: 34px; height: 34px; border-radius: 50%; border: 1px solid #d1d5db; background: #fff; font-size: 18px; line-height: 1; cursor: pointer; padding: 0; color: var(--cust-text, #1f2937); }
.sz-qty button:disabled { opacity: 0.4; cursor: not-allowed; }
.sz-qty span { min-width: 24px; text-align: center; font-weight: 700; }
.sz-actions { display: flex; gap: 10px; margin-top: 20px; }
.sz-actions button { flex: 1; height: 44px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; }
.sz-cancel { background: #fff; border: 1px solid #d1d5db; color: #374151; }
.sz-confirm { background: var(--gold); border: 1px solid var(--gold); color: #fff; }
.sz-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ---------- ฟังก์ชันช่วย ---------- */

function totalStock(p) {
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.reduce((sum, v) => sum + (Number(v.stock_qty) || 0), 0);
  }
  return Number(p.stock) || 0;
}

function sizeList(p) {
  if (Array.isArray(p.size_options) && p.size_options.length > 0) return p.size_options.map(String);
  const s = String(p.size || '').trim();
  if (!s || s === '-') return [];
  return s.split(/\s*[\/,]\s*/).filter(Boolean);
}

// ชื่อสี (ລາວ / ไทย / English) → สีจริงสำหรับวงกลมเล็ก
const COLOR_MAP = [
  ['ດຳ', '#111827'], ['ดำ', '#111827'], ['black', '#111827'],
  ['ຂາວ', '#ffffff'], ['ขาว', '#ffffff'], ['white', '#ffffff'], ['ຄີມ', '#f3ead3'], ['ครีม', '#f3ead3'], ['cream', '#f3ead3'],
  ['ກົມ', '#1e3a5f'], ['กรม', '#1e3a5f'], ['navy', '#1e3a5f'],
  ['ຟ້າ', '#4aa3df'], ['ฟ้า', '#4aa3df'], ['sky', '#4aa3df'],
  ['ນ້ຳເງິນ', '#1d4ed8'], ['น้ำเงิน', '#1d4ed8'], ['blue', '#1d4ed8'],
  ['ແດງ', '#dc2626'], ['แดง', '#dc2626'], ['red', '#dc2626'],
  ['ຂຽວ', '#16a34a'], ['เขียว', '#16a34a'], ['green', '#16a34a'],
  ['ເຫຼືອງ', '#facc15'], ['เหลือง', '#facc15'], ['yellow', '#facc15'],
  ['ສົ້ມ', '#f97316'], ['ส้ม', '#f97316'], ['orange', '#f97316'],
  ['ຊົມພູ', '#f472b6'], ['ชมพู', '#f472b6'], ['pink', '#f472b6'],
  ['ມ່ວງ', '#7c3aed'], ['ม่วง', '#7c3aed'], ['purple', '#7c3aed'],
  ['ເທົາ', '#9ca3af'], ['เทา', '#9ca3af'], ['gray', '#9ca3af'], ['grey', '#9ca3af'],
  ['ນ້ຳຕານ', '#92400e'], ['น้ำตาล', '#92400e'], ['brown', '#92400e'],
];
function colorDots(text) {
  const lower = String(text || '').toLowerCase();
  const found = [];
  COLOR_MAP.forEach(([k, hex]) => {
    const i = lower.indexOf(k);
    if (i >= 0) found.push({ i, hex });
  });
  found.sort((a, b) => a.i - b.i);
  const out = [];
  found.forEach((f) => { if (!out.includes(f.hex)) out.push(f.hex); });
  return out.slice(0, 3);
}

// ---------- ดาวรีวิว: 5 ดวงเรียงกัน เติมสีตามคะแนนเฉลี่ย ----------
const STAR_POINTS = '12,2 15,9 22,9.3 16.5,14 18.2,21 12,17 5.8,21 7.5,14 2,9.3 9,9';
function StarRow() {
  return [0, 1, 2, 3, 4].map((i) => (
    <svg key={i} width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points={STAR_POINTS} strokeWidth="1.2" strokeLinejoin="round" stroke="none" />
    </svg>
  ));
}
function Stars({ average, count }) {
  const avg = Math.max(0, Math.min(5, Number(average) || 0));
  return (
    <span className="pc-rate" title={`${avg.toFixed(1)} / 5`}>
      <span className="pc-stars" role="img" aria-label={`${avg.toFixed(1)} / 5`}>
        <span className="pc-stars-base"><StarRow /></span>
        <span className="pc-stars-fill" style={{ width: `${(avg / 5) * 100}%` }}><StarRow /></span>
      </span>
      <span>({count})</span>
    </span>
  );
}

// ---------- โครงตอนโหลด ----------
function SkeletonCard() {
  return (
    <div className="pc-card pc-skel-card" aria-hidden="true">
      <div className="pc-img pc-skel" />
      <div className="pc-body">
        <div className="pc-skel line" style={{ width: '85%' }} />
        <div className="pc-skel line" style={{ width: '50%' }} />
        <div className="pc-skel line" style={{ width: '40%', height: 22 }} />
        <div className="pc-bottom">
          <div className="pc-skel line" style={{ width: '55%', height: 22 }} />
          <div className="pc-skel btn" />
        </div>
      </div>
    </div>
  );
}

// ---------- การ์ดสินค้า ----------
function MiniCard({ p, rating, isFav, busy, cartCount, onOpen, onFav, onCart, onBuy }) {
  const { t } = usePageT(dict);
  const kip = t('common.kip');
  const stock = totalStock(p);
  const soldOut = stock <= 0;
  const lowStock = !soldOut && stock <= LOW_STOCK;
  const hasRating = !!rating && Number(rating.count) > 0;
  const soldCount = Number(p.sold_count) || 0;
  const hasSold = soldCount > 0;

  const onSale = !!p.is_promo && p.final_price != null && Number(p.final_price) < Number(p.price);
  const nowPrice = onSale ? p.final_price : p.price;
  const discountPct = onSale ? Math.round((1 - Number(p.final_price) / Number(p.price)) * 100) : 0;

  // ป้ายมุมซ้ายบน แสดงอันเดียว: ลดราคา > ขายดี (ถ้าเปิด) > ใหม่
  let tag = null;
  if (onSale && discountPct > 0) tag = { cls: 'sale', text: `-${discountPct}%` };
  else if (SHOW_BEST_TAG && (p.is_best || p.is_bestseller || soldCount >= BEST_SOLD)) tag = { cls: 'best', text: t('pc.best') };
  else if (p.is_new) tag = { cls: 'new', text: t('pc.new') };

  const sizes = sizeList(p);
  const shownSizes = sizes.slice(0, MAX_SIZE_CHIPS);
  const extraSizes = sizes.length - shownSizes.length;
  const offSizes = new Set(
    (Array.isArray(p.variants) ? p.variants : [])
      .filter((v) => (Number(v.stock_qty) || 0) <= 0)
      .map((v) => String(v.size))
  );
  const colorText = (p.color || '').trim();
  const dots = colorDots(colorText);

  return (
    <div
      className="pc-card"
      role="link"
      tabIndex={0}
      onClick={() => onOpen(p.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(p.id); }}
    >
      <div className="pc-img">
        {p.image ? (
          <img src={`${API_BASE}${p.image}`} alt={p.name} loading="lazy" />
        ) : (
          <div className="pc-noimg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 16-5-5-9 9" />
            </svg>
          </div>
        )}
        {tag && <span className={`pc-tag ${tag.cls}`}>{tag.text}</span>}
        {soldOut && <div className="pc-soldout"><span>{t('common.soldOut')}</span></div>}
        <button className="pc-fav" aria-label={t('common.favorite')} onClick={(e) => onFav(e, p.id)}>
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill={isFav ? '#e53935' : 'none'}
            stroke={isFav ? '#e53935' : '#6b7280'}
            strokeWidth="2" strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
      </div>

      <div className="pc-body">
        <h3 className="pc-name" title={p.name}>{p.name}</h3>

        {/* ดาวรีวิว (ไม่มีรีวิว = ไม่แสดง) */}
        {hasRating && <Stars average={rating.average} count={rating.count} />}

        {(sizes.length > 0 || colorText) && (
          <div className="pc-meta">
            {sizes.length > 0 && (
              <div className="pc-sizes" aria-label={t('common.size')}>
                {shownSizes.map((s, i) => (
                  <span key={`${s}-${i}`} className={`pc-size${offSizes.has(s) ? ' off' : ''}`}>{s}</span>
                ))}
                {extraSizes > 0 && <span className="pc-size more">+{extraSizes}</span>}
              </div>
            )}
            {colorText && (
              <div className="pc-color" title={colorText}>
                {dots.length > 0 && (
                  <span className="pc-color-dots">
                    {dots.map((hex) => <span key={hex} className="pc-color-dot" style={{ background: hex }} />)}
                  </span>
                )}
                <span className="pc-color-name">{colorText}</span>
              </div>
            )}
          </div>
        )}

        <div className="pc-bottom">
          <div className="pc-price">
            <span className={`pc-now${onSale ? ' sale' : ''}`}>
              {formatPrice(nowPrice)}<small>{kip}</small>
            </span>
            {onSale && <span className="pc-was">{formatPrice(p.price)}</span>}
          </div>

          {/* ยอดขายใต้ราคา (ซ้าย) / ในตะกร้า (ขวา) */}
          <div className="pc-soldline">
            {hasSold ? <span>{t('ch.sold', { n: soldCount })}</span> : <span />}
            {cartCount > 0 && <span className="incart">{t('ch.inCart', { n: cartCount })}</span>}
          </div>

          {/* เหลือน้อย / หมด (แสดงเมื่อจำเป็น) */}
          {soldOut ? (
            <div className="pc-stocknote out">{t('common.soldOut')}</div>
          ) : lowStock ? (
            <div className="pc-stocknote low">{t('common.stockLeft', { n: stock })}</div>
          ) : null}

          <div className="pc-gap" />

          <div className="pc-actions">
            <button
              className="pc-buy"
              disabled={soldOut || busy}
              onClick={(e) => { e.stopPropagation(); onBuy(p); }}
            >
              {soldOut ? t('common.soldOut') : (busy ? '...' : t('common.buyNow'))}
            </button>
            <button
              className="pc-cart"
              title={t('common.addToCart')}
              aria-label={t('common.addToCart')}
              disabled={soldOut || busy}
              onClick={(e) => { e.stopPropagation(); onCart(p); }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- ป๊อปอัปเลือกไซส์ ----------
function SizeModal({ product, inCart, onCancel, onConfirm, busy }) {
  const { t } = usePageT(dict);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);

  const options = product.size_options || [];
  const stock = totalStock(product);
  const maxQty = Math.max(0, stock - inCart);

  function submit() {
    if (!size) {
      setError(true);
      return;
    }
    onConfirm(size, qty);
  }

  return (
    <div className="sz-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="sz-box">
        <div className="sz-head">
          {product.image && <img src={`${API_BASE}${product.image}`} alt={product.name} />}
          <div>
            <div className="sz-name">{product.name}</div>
            <div className="sz-sub">
              {t('common.stockLeft', { n: stock })}
              {inCart > 0 ? ` · ${t('ch.inCart', { n: inCart })}` : ''}
            </div>
          </div>
        </div>

        <div className="sz-title">
          {t('ch.chooseSize')}{size && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>: {size}</span>}
        </div>
        <div className={`sz-sizes${error ? ' err' : ''}`}>
          {options.map((s) => (
            <button
              key={s}
              type="button"
              className={`sz-size${size === s ? ' active' : ''}`}
              onClick={() => { setSize(s); setError(false); }}
            >
              {s}
            </button>
          ))}
        </div>
        {error && <div className="sz-err">{t('ch.pickSizeFirst')}</div>}

        <div className="sz-qty-row">
          <span className="sz-title" style={{ margin: 0 }}>{t('common.quantity')}</span>
          <div className="sz-qty">
            <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span>{qty}</span>
            <button type="button" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}>+</button>
          </div>
        </div>
        {maxQty <= 0 && <div className="sz-err">{t('ch.cartFull')}</div>}

        <div className="sz-actions">
          <button type="button" className="sz-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="sz-confirm" disabled={busy || maxQty <= 0} onClick={submit}>
            {busy ? '...' : t('ch.addBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductListInner() {
  const { t } = usePageT(dict);
  const [products, setProducts] = useState(null);
  const [banners, setBanners] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showTop, setShowTop] = useState(false);
  const [favIds, setFavIds] = useState(new Set());
  const [cartQty, setCartQty] = useState({});
  const [ratings, setRatings] = useState({});
  const [sizeProduct, setSizeProduct] = useState(null);
  const [sizeBusy, setSizeBusy] = useState(false);
  const catRef = useRef(null);
  const navigate = useNavigate();
  const { refreshCartCount } = useCart();

  useEffect(() => {
    loadProducts();
    loadBanners();
    loadFavoriteIds();
    loadCartQty();
    loadRatings();
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, activeCategory]);

  function showToast(msg, ms = 1800) {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  }

  async function loadProducts() {
    setLoadError(false);
    try {
      const { ok, data } = await apiGet('/api/products');
      if (ok && Array.isArray(data)) {
        setProducts(data);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  }

  async function loadBanners() {
    try {
      const { ok, data } = await apiGet('/api/banners');
      if (ok && Array.isArray(data)) setBanners(data);
    } catch (err) {
      // ບໍ່ມີແບນເນີ ກໍບໍ່ເປັນຫຍັງ
    }
  }

  async function loadFavoriteIds() {
    try {
      const { ok, data } = await apiGet('/api/favorites/ids');
      if (ok && Array.isArray(data)) setFavIds(new Set(data));
    } catch (err) {
      // ບໍ່ login ຫຼື error — ປ່ອຍເປັນຫວ່າງ
    }
  }

  async function loadRatings() {
    try {
      const { ok, data } = await apiGet('/api/reviews/summary');
      if (ok && data && data.summary) setRatings(data.summary);
    } catch (err) {
      // ດຶງບໍ່ໄດ້ ກໍບໍ່ສະແດງດາວ
    }
  }

  async function loadCartQty() {
    try {
      const { ok, data } = await apiGet('/api/cart');
      if (ok && data && Array.isArray(data.items)) {
        const map = {};
        data.items.forEach((i) => {
          map[i.product_id] = (map[i.product_id] || 0) + i.quantity;
        });
        setCartQty(map);
      }
    } catch (err) {
      // ບໍ່ login ຫຼື error — ບໍ່ສະແດງຕົວເລກ
    }
  }

  async function toggleFavorite(e, productId) {
    e.stopPropagation();
    const isFav = favIds.has(productId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(productId);
      else next.add(productId);
      return next;
    });
    try {
      if (isFav) await apiDelete(`/api/favorites/${productId}`);
      else await apiPost(`/api/favorites/${productId}`, {});
    } catch (err) {
      console.error(err);
    }
  }

  async function addToCart(product) {
    if ((product.size_options || []).length > 0) {
      setSizeProduct(product);
      return;
    }
    setBusyId(product.id);
    try {
      const { ok } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (ok) {
        showToast(t('common.addedToCart'), 1500);
        refreshCartCount();
        loadCartQty();
      } else {
        showToast(t('common.addFail'), 2000);
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.addFail'), 2000);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmSizeAdd(size, quantity) {
    if (!sizeProduct) return;
    setSizeBusy(true);
    try {
      const { ok } = await apiPost('/api/cart', {
        product_id: sizeProduct.id,
        quantity,
        size,
      });
      if (ok) {
        setSizeProduct(null);
        showToast(t('common.addedToCart'), 1500);
        refreshCartCount();
        loadCartQty();
      } else {
        showToast(t('common.addFail'), 2200);
      }
    } catch (err) {
      console.error(err);
      showToast(t('common.addFail'), 2200);
    } finally {
      setSizeBusy(false);
    }
  }

  async function buyNow(product) {
    if ((product.size_options || []).length > 0) {
      navigate(`/menu/product/${product.id}`);
      return;
    }
    setBusyId(product.id);
    try {
      const { ok } = await apiPost('/api/cart', { product_id: product.id, quantity: 1 });
      if (!ok) {
        showToast(t('ch.buyFail'), 2000);
        return;
      }
      refreshCartCount();
      navigate('/menu/checkout');
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setActiveCategory('');
  }

  function goCategories() {
    if (catRef.current) catRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const categories = products
    ? Array.from(new Set(products.map((p) => (p.category || '').trim()).filter(Boolean)))
    : [];
  const currentCategory = categories.includes(activeCategory) ? activeCategory : '';

  const keyword = search.trim().toLowerCase();

  let filteredProducts = null;
  if (products) {
    filteredProducts = products.filter((p) => {
      if (currentCategory && (p.category || '').trim() !== currentCategory) return false;
      if (keyword && !(p.name || '').toLowerCase().includes(keyword)) return false;
      return true;
    });
  }

  const headingText = keyword
    ? t('ch.searchResult', { n: filteredProducts ? filteredProducts.length : 0 })
    : currentCategory ? currentCategory : t('ch.allProducts');

  const totalCartQty = Object.values(cartQty).reduce((a, b) => a + b, 0);
  const shownProducts = filteredProducts ? filteredProducts.slice(0, visible) : [];
  const remaining = filteredProducts ? filteredProducts.length - shownProducts.length : 0;
  const hasFooter = !!(SHOP.whatsapp || SHOP.facebook || SHOP.hours || SHOP.address);

  return (
    <div className="customer-shell">
      <style>{extraCss}</style>

      {toast && (
        <div className="pc-toast" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {toast}
        </div>
      )}

      <TopBar search={search} onSearch={setSearch} />

      {!keyword && <HomeHero banners={banners} />}

      <main className="pc-page" style={{ paddingBottom: 24 }}>
        {products === null && !loadError && (
          <section className="hm-section">
            <div className="pc-grid" aria-busy="true">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </section>
        )}
        {loadError && (
          <div style={{ padding: 20, color: 'var(--cust-text-muted, #6b7280)' }}>
            <p>{t('ch.loadFail')}</p>
            <button onClick={loadProducts}>{t('common.retry')}</button>
          </div>
        )}
        {products && products.length === 0 && (
          <p style={{ padding: 20, color: 'var(--cust-text-muted, #6b7280)' }}>{t('ch.empty')}</p>
        )}

        {products && products.length > 0 && (
          <section className="hm-section">
            {/* แถบความมั่นใจ: 3 การ์ดเท่ากัน ไอคอนวงกลมทอง */}
            {!keyword && (
              <div className="pc-trust">
                <div className="pc-trust-item">
                  <span className="pc-trust-ic">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="18.5" cy="18.5" r="2" /></svg>
                  </span>
                  <span>{t('pc.trust1')}</span>
                </div>
                <div className="pc-trust-item">
                  <span className="pc-trust-ic">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>
                  </span>
                  <span>{t('pc.trust2')}</span>
                </div>
                <div className="pc-trust-item">
                  <span className="pc-trust-ic">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" /></svg>
                  </span>
                  <span>{t('pc.trust3')}</span>
                </div>
              </div>
            )}

            {/* หัวข้อ + หมวดหมู่ (โครงเดิมของหน้า) */}
            <div className="hm-section-head" ref={catRef}>
              <h2 className="hm-section-title">
                {headingText}
                <span className="hm-count">{t('pc.count', { n: filteredProducts.length })}</span>
              </h2>
              <CategoryBar
                products={products}
                selected={currentCategory}
                onSelect={setActiveCategory}
              />
            </div>

            <div className="pc-gridgap" />

            {filteredProducts.length === 0 ? (
              <div className="pc-empty">
                <div className="pc-empty-ic">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <p>{t('ch.noResult')}</p>
                <button type="button" onClick={resetFilters}>{t('pc.reset')}</button>
              </div>
            ) : (
              <>
                <div className="pc-grid">
                  {shownProducts.map((p) => (
                    <MiniCard
                      key={p.id}
                      p={p}
                      rating={ratings[p.id]}
                      isFav={favIds.has(p.id)}
                      busy={busyId === p.id}
                      cartCount={cartQty[p.id] || 0}
                      onOpen={(id) => navigate(`/menu/product/${id}`)}
                      onFav={toggleFavorite}
                      onCart={addToCart}
                      onBuy={buyNow}
                    />
                  ))}
                </div>
                {remaining > 0 && (
                  <div className="pc-more">
                    <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      {t('pc.loadMore', { n: remaining })}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ส่วนท้าย: แสดงเมื่อใส่ข้อมูลใน SHOP */}
        {hasFooter && (
          <footer className="pc-footer">
            {(SHOP.whatsapp || SHOP.facebook) && (
              <div>
                <h4>{t('pc.contact')}</h4>
                <p>
                  {SHOP.whatsapp && <a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {SHOP.facebook && <a href={SHOP.facebook} target="_blank" rel="noreferrer">Facebook</a>}
                </p>
              </div>
            )}
            {(SHOP.hours || SHOP.address) && (
              <div>
                {SHOP.hours && <><h4>{t('pc.hours')}</h4><p>{SHOP.hours}</p></>}
                {SHOP.address && <><h4 style={{ marginTop: 12 }}>{t('pc.address')}</h4><p>{SHOP.address}</p></>}
              </div>
            )}
          </footer>
        )}
      </main>

      {/* ปุ่มลอย */}
      {(SHOP.whatsapp || showTop) && (
        <div className="pc-fabs">
          {showTop && (
            <button type="button" className="pc-fab top" aria-label={t('pc.top')} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
            </button>
          )}
          {SHOP.whatsapp && (
            <a className="pc-fab wa" href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6A12 12 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 21.9c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 0 1 2.1 12C2.1 6.5 6.5 2.1 12 2.1S21.9 6.5 21.9 12 17.5 21.9 12 21.9zm5.4-7.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.8.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.3z" /></svg>
            </a>
          )}
        </div>
      )}

      {/* แถบเมนูล่าง (มือถือ) */}
      <nav className="pc-nav" aria-label="Main">
        <div className="pc-nav-in">
          <button type="button" className="active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
            {t('pc.navHome')}
          </button>
          <button type="button" onClick={goCategories}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
            {t('pc.navCat')}
          </button>
          <button type="button" onClick={() => navigate(ROUTES.fav)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>
            {t('pc.navFav')}
          </button>
          <button type="button" onClick={() => navigate(ROUTES.cart)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            {totalCartQty > 0 && <span className="pc-nav-badge">{totalCartQty > 99 ? '99+' : totalCartQty}</span>}
            {t('pc.navCart')}
          </button>
          <button type="button" onClick={() => navigate(ROUTES.account)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            {t('pc.navAccount')}
          </button>
        </div>
      </nav>

      {sizeProduct && (
        <SizeModal
          key={sizeProduct.id}
          product={sizeProduct}
          inCart={cartQty[sizeProduct.id] || 0}
          busy={sizeBusy}
          onCancel={() => setSizeProduct(null)}
          onConfirm={confirmSizeAdd}
        />
      )}
    </div>
  );
}

export default function ProductList() {
  return (
    <CartProvider>
      <ProductListInner />
    </CartProvider>
  );
}