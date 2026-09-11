const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const qrcodeRouter = require('./routes/qrcode');
const authRouter = require('./routes/auth');
const customerAuthRouter = require('./routes/customerAuth');
const customerOrdersRouter = require('./routes/customerOrders');
const staffRouter = require('./routes/staff');
const customersRouter = require('./routes/customers');
const messagesRouter = require('./routes/messages');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',              // Vite dev server
  'https://polo-shop-4e1c0.web.app',    // Firebase Hosting (production)
  'https://polo-shop-4e1c0.firebaseapp.com',
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

// ✅ ຮູບພາບທີ່ອັບໂຫລດ (ສິນຄ້າ, ສະລິບ, ຮູບແຊັດ) ຍັງເກັບໄວ້ໃນ public/uploads ຄືເດີມ
app.use('/uploads', express.static(path.join(__dirname, './public/uploads')));

// ✅ Serve ໄຟລ໌ React ທີ່ Build ແລ້ວ (ແທນ /admin ແລະ /menu HTML ເກົ່າ)
app.use(express.static(path.join(__dirname, '../polo-shop-react/dist')));

const settingsRouter = require('./routes/settings');
// ...        
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/customer-auth', customerAuthRouter);
app.use('/api/customer', customerOrdersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/qrcode', qrcodeRouter);
app.use('/api/customers', customersRouter);
app.use('/api/staff', staffRouter);
// ປອງກັນ API ຂອງແອດມິນ ຕ້ອງ login ກ່ອນ (ຍົກເວັ້ນ GET ທີ່ໜ້າ menu ຕ້ອງໃຊ້)


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກຳລງເຮັດວຽກຢູ່' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກຳລັງເຮັດວຽກຢູ່' });
});

// ✅ SPA fallback — ທຸກເສັ້ນທາງທີ່ບໍ່ແມ່ນ /api ໃຫ້ສົ່ງ index.html ຂອງ React ໄປແທນ
// ຕ້ອງຢູ່ຫຼັງສຸດ (ຫຼັງທຸກ /api routes) ບໍ່ຢ່າງນັ້ນຈະໄປທັບ API
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../polo-shop-react/dist/index.html'));
});
app.listen(PORT, () => {
  console.log(`Server ຣັນຢູທີ່ http://localhost:${PORT}`);
});