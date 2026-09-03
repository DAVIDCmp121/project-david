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

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/menu/index.html'));
});

app.use(express.static(path.join(__dirname, '../public')));

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

app.listen(PORT, () => {
  console.log(`Server ຣັນຢູທີ່ http://localhost:${PORT}`);
});