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
const customerOrdersRouter = require('./routes/customerOrders');
const staffRouter = require('./routes/staff');
const customersRouter = require('./routes/customers');
const messagesRouter = require('./routes/messages');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:3000',                          // เขาผาน backend โดยตรง
  'http://localhost:5173',                          // Vite dev server
  'https://polo-shop-4e1c0.web.app',                 // Firebase Hosting (production)
  'https://polo-shop-4e1c0.firebaseapp.com',
  'http://localhost:8081', // Docker (nginx)
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

// ✅ ຮບພາບທອບໂຫລດ (ສນຄ້າ, ສະລິບ, ຮູບແຊັດ) ຍັງເກບໄວໃນ public/uploads ຄືເດມ
app.use('/uploads', express.static(path.join(__dirname, './public/uploads')));

// ✅ Serve ໄຟລ React ທ Build ແລວ (ແທນ /admin ແລະ /menu HTML ເກົາ)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

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
// ປອງກນ API ຂອງແອດມນ ຕອງ login ກອນ (ຍົກເວນ GET ທໜາ menu ຕອງໃຊ)


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກລງເຮັດວຽກຢູ' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກລງເຮັດວຽກຢູ' });
});

// ✅ SPA fallback — ທກເສັນທາງທີ່ບແມ່ນ /api ໃຫສົງ index.html ຂອງ React ໄປແທນ
// ຕອງຢູຫຼງສດ (ຫງທກ /api routes) ບຢ່າງນນຈະໄປທບ API
app.get(/^(?!\/api).*/, (req, res) => {
 res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server ຣັນຢູທ http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('❌ ສາງຕາຕະລາງບສເລດ:', err);
  process.exit(1);
});