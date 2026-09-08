# POLO SHOP — React Frontend (ຍ້າຍຈາກ Vanilla JS)

## ນີ້ແມ່ນຫຍັງ
ໂຟນເດີນີ້ແມ່ນ Frontend ໃໝ່ທັງໝົດຂອງ POLO SHOP ທີ່ຂຽນຄືນດ້ວຍ **React + Vite** ແທນ HTML/CSS/Vanilla JS ເກົ່າ
**Backend (server/ ທັງໝົດ) ບໍ່ຕ້ອງແກ້ຫຍັງເລີຍ** — React ຈະເອີ້ນ API ເສັ້ນທາງເກົ່າໝົດ (`/api/orders`, `/api/products` ...)

## ຂັ້ນຕອນຕິດຕັ້ງ (ເຮັດຢູ່ເຄື່ອງທ່ານ)

### 1) ວາງໂຟນເດີນີ້
ເອົາໂຟນເດີ `polo-shop-react` ນີ້ໄປວາງໄວ້ຂ້າງໆ `server/` ແລະ `public/` ເກົ່າ (ລະດັບດຽວກັນ ໃນ `project-david`)

### 2) ຕິດຕັ້ງ dependencies
```
cd polo-shop-react
npm install
```
(ຂັ້ນຕອນນີ້ຕ້ອງໃຊ້ອິນເຕີເນັດ ຈະດາວໂຫລດ React, React Router, Vite ອັດຕະໂນມັດ)

### 3) ຮັນຕອນພັດທະນາ (Development)
ເປີດ 2 terminal ພ້ອມກັນ:
```
# Terminal 1 — ຮັນ Backend ເກົ່າຄືເດີມ
node server/server.js

# Terminal 2 — ຮັນ React (ຢູ່ໃນໂຟນເດີ polo-shop-react)
npm run dev
```
ຈາກນັ້ນເປີດ `http://localhost:5173` — React ຈະສົ່ງ request `/api/*` ໄປໃຫ້ Express (port 3000) ໃຫ້ອັດຕະໂນມັດຜ່ານ Proxy ທີ່ຕັ້ງໄວ້ໃນ `vite.config.js`

### 4) Build ສຳລັບໃຊ້ງານຈິງ (Production)
```
npm run build
```
ຈະໄດ້ໂຟນເດີ `dist/` ທີ່ມີໄຟລ໌ HTML/CSS/JS ພ້ອມໃຊ້

### 5) ໃຫ້ Express Serve ໄຟລ໌ React ແທນຂອງເກົ່າ
ໃນ `server/server.js` ຕ້ອງເພີ່ມ/ແກ້ປະມານນີ້ (ຕຳແໜ່ງ ຫຼັງຈາກ routes API ທັງໝົດ, ກ່ອນ `app.listen`):

```javascript
const path = require('path');

// ✅ Serve ໄຟລ໌ React ທີ່ Build ແລ້ວ
app.use(express.static(path.join(__dirname, '../polo-shop-react/dist')));

// ✅ SPA fallback — ທຸກເສັ້ນທາງທີ່ບໍ່ແມ່ນ /api ໃຫ້ສົ່ງ index.html ຂອງ React ໄປແທນ
// (ເພື່ອໃຫ້ React Router ຈັດການ routing ເອງຝັ່ງ client)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../polo-shop-react/dist/index.html'));
});
```

**ສຳຄັນ:** ຕ້ອງໃສ່ 2 ແຖວນີ້ **ຫຼັງ** ຈາກທຸກ `app.use('/api/...', ...)` ເກົ່າ ບໍ່ຢ່າງນັ້ນຈະໄປທັບເສັ້ນທາງ API

ຫຼັງຈາກນັ້ນ ໄຟລ໌ເກົ່າໃນ `public/admin/`, `public/menu/`, `public/staff/` (HTML ເກົ່າ) ຈະບໍ່ຖືກໃຊ້ອີກຕໍ່ໄປ — ແນະນຳໃຫ້ທົດສອບ React ໃຫ້ແນ່ໃຈວ່າທຸກຢ່າງເຮັດວຽກຄົບກ່ອນ ຈຶ່ງລຶບໄຟລ໌ເກົ່າອອກ

## ໂຄງສ້າງໄຟລ໌
```
src/
  api.js                    ← helper ກາງສຳລັບເອີ້ນ API (ໃສ່ credentials:'include' ອັດຕະໂນມັດ)
  App.jsx                   ← ລວມທຸກ route
  components/
    AdminLayout.jsx          ← ແທນ auth-guard.js (ກວດ login+role, ໂຊວ໌ nav)
    CustomerHeader.jsx       ← ແທນ account.js (ເມນູບັນຊີລູກຄ້າ)
  pages/customer/            ← 5 ໜ້າ: ProductList, Login, Checkout, Orders, Chat
  pages/admin/                ← 7 ໜ້າ: AdminLogin, AdminProducts, AdminOrders,
                                  AdminQrCode, AdminChat, AdminCustomers, AdminStaff
  pages/staff/StaffLogin.jsx
  styles/global.css          ← ສີ/ໂຕນດຽວກັບເວັບເກົ່າ (ຄຳ/ດຳ=ລູກຄ້າ, ຟ້າ/ເທົາ=ແອດມິນ)
```

## ⚠️ ຈຸດທີ່ຕ້ອງກວດສອບ (ສ້າງຂຶ້ນຈາກການສົມມຸດ ເພາະບໍ່ມີໄຟລ໌ຕົ້ນສະບັບໃຫ້ເບິ່ງ)

ໄຟລ໌ຕໍ່ໄປນີ້ບໍ່ເຄີຍຖືກສົ່ງມາໃຫ້ເບິ່ງໃນລະຫວ່າງການສົນທະນາ ຈຶ່ງສ້າງຂຶ້ນຕາມຄຸນສົມບັດທີ່ອະທິບາຍໄວ້ ແລະ ອາດຈະບໍ່ຕົງກັບຂອງເກົ່າ 100%:

1. **`pages/customer/Chat.jsx`** — ສົມມຸດວ່າໃຊ້ `GET /api/messages` (ອ່ານ) ແລະ `POST /api/messages` (ສົ່ງ) — ຖ້າ endpoint ຕົວຈິງຊື່ອື່ນ ແຈ້ງໄດ້ເລີຍ
2. **`pages/admin/AdminLogin.jsx`** — ສ້າງຂຶ້ນຄືກັນກັບ staff/login.html (ອາດຈະຕ່າງດ້ານໜ້າຕາ)
3. **`pages/admin/AdminProducts.jsx`** — ສົມມຸດວ່າອັບໂຫລດ QR ຮັບເງິນຜ່ານ `POST /api/settings/payment-qr` — ຖ້າຊື່ຕ່າງອອກໄປ ແຈ້ງໄດ້ເລີຍ
4. **`pages/admin/AdminCustomers.jsx`** — ສົມມຸດວ່າໃຊ້ `GET /api/customers` ແລະ `POST /api/customers/:id/reset-pin`

ຖ້າລອງໃຊ້ແລ້ວພົບວ່າໜ້າໃດເຮັດວຽກບໍ່ຖືກຕ້ອງ (ຂຶ້ນ error ຫຼືຂໍ້ມູນບໍ່ຂຶ້ນ) ໃຫ້ບອກຊື່ໜ້າ + error ທີ່ເຫັນ ຈະໄດ້ແກ້ໃຫ້ຖືກຕ້ອງ
