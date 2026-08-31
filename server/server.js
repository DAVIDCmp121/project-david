const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const qrcodeRouter = require('./routes/qrcode');
const authRouter = require('./routes/auth');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

const settingsRouter = require('./routes/settings');
// ...
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/qrcode', qrcodeRouter);

// ປອງກັນ API ຂອງແອດມິນ ຕ້ອງ login ກ່ອນ (ຍົກເວັ້ນ GET ທີ່ໜ້າ menu ຕ້ອງໃຊ້)


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກຳລັງເຮັດວຽກຢູ່' });
});

app.listen(PORT, () => {
  console.log(`Server ຣັນຢູທີ່ http://localhost:${PORT}`);
});