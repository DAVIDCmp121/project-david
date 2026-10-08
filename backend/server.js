const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./db');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const qrcodeRouter = require('./routes/qrcode');
const authRouter = require('./routes/auth');
const customerAuthRouter = require('./routes/customerAuth');
const customerAccountRouter = require('./routes/customerAccount');
const customerOrdersRouter = require('./routes/customerOrders');
const staffRouter = require('./routes/staff');
const customersRouter = require('./routes/customers');
const messagesRouter = require('./routes/messages');
const cartRouter = require('./routes/cart');
const settingsRouter = require('./routes/settings');
const carriersRouter = require('./routes/carriers');
const couponsRouter = require('./routes/coupons');
const posRouter = require('./routes/pos');
const reportsRouter = require('./routes/reports');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:3000',                 // ເຂົ້າຜ່ານ backend ໂດຍກົງ
  'http://localhost:5173',                 // Vite dev server
  'https://polo-shop-4e1c0.web.app',       // Firebase Hosting (production)
  'https://polo-shop-4e1c0.firebaseapp.com',
  'http://localhost:8081',                 // Docker (nginx)
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ຮູບພາບທີ່ອັບໂຫລດ (ສິນຄ້າ, ສະລິບ, ຮູບແຊັດ) ເກັບໄວ້ໃນ public/uploads ຄືເດີມ
app.use('/uploads', express.static(path.join(__dirname, './public/uploads')));

// Serve ໄຟລ໌ React ທີ່ Build ແລ້ວ
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/customer-auth', customerAuthRouter);
app.use('/api/customer-account', customerAccountRouter);
app.use('/api/customer', customerOrdersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/products', productsRouter);
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/orders', ordersRouter);
app.use('/api/qrcode', qrcodeRouter);
app.use('/api/customers', customersRouter);
app.use('/api/staff', staffRouter);
app.use('/api/cart', cartRouter);
app.use('/api/carriers', carriersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/pos', posRouter); // ຂາຍໜ້າຮ້ານ (POS)
app.use('/api/reports', reportsRouter); // ລາຍງານຍອດຂາຍ (ສະເພາະແອດມິນ)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກຳລັງເຮັດວຽກຢູ່' });
});

// SPA fallback — ທຸກເສັ້ນທາງທີ່ບໍ່ແມ່ນ /api ໃຫ້ສົ່ງ index.html ຂອງ React ໄປແທນ
// ຕ້ອງຢູ່ຫຼັງສຸດ (ຫຼັງທຸກ /api routes) ບໍ່ຢ່າງນັ້ນຈະໄປທັບ API
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server ຣັນຢູ່ທີ່ http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ ສ້າງຕາຕະລາງບໍ່ສຳເລັດ:', err);
    process.exit(1);
  });