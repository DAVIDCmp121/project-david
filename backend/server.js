const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const { initDb, pool } = require('./db');
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
const reviewsRouter = require('./routes/reviews');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// ຢູ່ຫຼັງ proxy ຂອງ Render — ໃຫ້ req.protocol ເປັນ https ຖືກຕ້ອງ
app.set('trust proxy', 1);

// ເວັບໜ້າບ້ານ (Firebase) ແລະ path ຫນ້າສິນຄ້າ — ໃຊ້ໃນລິງແຊຣ໌ (Open Graph)
// ຖ້າ path ຫນ້າສິນຄ້າໃນ React router ບໍ່ແມ່ນ /menu/product/:id ໃຫ້ແກ້ບ່ອນນີ້
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://polo-shop-4e1c0.web.app';
const PRODUCT_PAGE_PATH = '/menu/product/';

const allowedOrigins = [
  'http://localhost:3000',                 // ເຂົ້າຜ່ານ backend ໂດຍກົງ
  'http://localhost:5173',                 // Vite dev server
  'https://polo-shop-4e1c0.web.app',       // Firebase Hosting (production)
  'https://polo-shop-4e1c0.firebaseapp.com',
  'http://localhost:8081',                 // Docker (nginx)
];

// ລິງທົດສອບ (preview channel) ຂອງໂປຣເຈັກນີ້ເທົ່ານັ້ນ ເຊັ່ນ polo-shop-4e1c0--preview-xxxx.web.app
const previewOriginPattern = /^https:\/\/polo-shop-4e1c0--[a-z0-9-]+\.(web\.app|firebaseapp\.com)$/;
const cloudflarePattern = /^https:\/\/([a-z0-9-]+\.)?(trycloudflare\.com|pages\.dev)$/;

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || previewOriginPattern.test(origin) || cloudflarePattern.test(origin)) {
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
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

app.use('/api/shipping-config', require('./routes/shipping-settings'));
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
app.use('/api/reviews', reviewsRouter); // ຣີວິວສິນຄ້າ

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server ກຳລັງເຮັດວຽກຢູ່' });
});

// ກັນ XSS ເວລາເອົາຂໍ້ຄວາມໄປໃສ່ໃນ HTML
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ເຮັດໃຫ້ຮູບເປັນ URL ເຕັມ (LINE/Facebook ຕ້ອງການ URL ເຕັມ)
function absoluteImage(baseUrl, image) {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;            // Cloudinary ຫຼື URL ເຕັມ
  if (image.startsWith('/')) return baseUrl + image;        // ເຊັ່ນ /uploads/xxx.jpg
  return baseUrl + '/uploads/' + image;                     // ມີແຕ່ຊື່ໄຟລ໌
}

// GET /share/product/:id — ລິງສຳລັບແຊຣ໌
// ບັອດ (LINE, Facebook) ອ່ານ meta og ເພື່ອສະແດງຮູບ+ຊື່+ລາຄາ ສ່ວນຄົນຈິງຈະຖືກເດັ້ງໄປໜ້າສິນຄ້າໃນເວັບ
app.get('/share/product/:id', async (req, res) => {
  const id = Number(req.params.id);
  const target = FRONTEND_URL + PRODUCT_PAGE_PATH + (id || '');
  try {
    if (!id) return res.redirect(FRONTEND_URL);

    const [rows] = await pool.query(
      'SELECT id, name, price, description, image FROM products WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.redirect(FRONTEND_URL);

    const p = rows[0];
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const price = Number(p.price || 0).toLocaleString('en-US');
    const title = `${p.name} — ${price} ກີບ`;
    const desc = (p.description || 'POLO SHOP').replace(/\s+/g, ' ').slice(0, 120);
    const img = absoluteImage(baseUrl, p.image);

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="lo">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="POLO SHOP">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc)}">
  <meta property="og:url" content="${escapeHtml(target)}">
  ${img ? `<meta property="og:image" content="${escapeHtml(img)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
</head>
<body>
  <script>window.location.replace(${JSON.stringify(target)});</script>
  <a href="${escapeHtml(target)}">${escapeHtml(p.name)}</a>
</body>
</html>`);
  } catch (err) {
    console.error('Error share product:', err);
    res.redirect(FRONTEND_URL);
  }
});

// SPA fallback — ທຸກເສັ້ນທາງທີ່ບໍ່ແມ່ນ /api ໃຫ້ສົ່ງ index.html ຂອງ React ໄປແທນ
// ຕ້ອງຢູ່ຫຼັງສຸດ (ຫຼັງທຸກ /api routes ແລະ /share) ບໍ່ຢ່າງນັ້ນຈະໄປທັບ
app.get(/^(?!\/api).*/, (req, res) => {
  if (fs.existsSync(frontendIndexPath)) {
    return res.sendFile(frontendIndexPath);
  }
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>POLO SHOP API Server</title></head>
<body style="font-family: system-ui, sans-serif; text-align: center; padding: 50px;">
  <h2>🚀 Backend API Server is running</h2>
  <p>Frontend is available at: <a href="http://localhost:8081">http://localhost:8081</a></p>
  <p>API Health Check: <a href="/api/health">/api/health</a></p>
</body>
</html>`);
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