require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'polo_shop',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    : undefined,
});

async function addColumnIfMissing(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (Number(rows[0].c) === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}
async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return Number(rows[0].c) > 0;
}

// ເພີ່ມຄອລຳ size ໃຫ້ cart_items / order_items ແລະ ແກ້ unique key ຂອງຕະກຣ້າ
// ໃຫ້ສິນຄ້າດຽວກັນແຕ່ຄົນລະໄຊສ໌ ໃສ່ໄດ້ຫຼາຍແຖວ
async function migrateSizes() {
  await addColumnIfMissing('products', 'size_selectable', 'TINYINT DEFAULT 0');

  try {
    if (await tableExists('order_items')) {
      await addColumnIfMissing('order_items', 'size', "VARCHAR(50) NOT NULL DEFAULT ''");
    }

    if (await tableExists('cart_items')) {
      await addColumnIfMissing('cart_items', 'size', "VARCHAR(50) NOT NULL DEFAULT ''");

      const [uniq] = await pool.query(
        `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
         FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cart_items'
           AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'
         GROUP BY INDEX_NAME`
      );
      const hasNew = uniq.some((u) => String(u.cols) === 'customer_id,product_id,size');
      const oldOnes = uniq.filter((u) => String(u.cols) === 'customer_id,product_id');

      if (!hasNew && oldOnes.length > 0) {
        await pool.query(
          'ALTER TABLE cart_items ADD UNIQUE INDEX uniq_cart_cust_prod_size (customer_id, product_id, size)'
        );
      }
      for (const o of oldOnes) {
        try {
          await pool.query(`ALTER TABLE cart_items DROP INDEX \`${o.INDEX_NAME}\``);
        } catch (e) {
          console.warn('⚠️ ລຶບ unique key ເກົ່າບໍ່ໄດ້:', e.message);
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ migrateSizes:', err.message);
  }
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      size VARCHAR(50),
      color VARCHAR(50),
      stock INT DEFAULT 0,
      image VARCHAR(255)
    )
  `);

  await addColumnIfMissing('products', 'description', 'TEXT NULL');
  await addColumnIfMissing('products', 'size_chart', 'TEXT NULL');
  await addColumnIfMissing('products', 'sort_order', 'INT DEFAULT 0');
  await addColumnIfMissing('products', 'category', 'VARCHAR(100) NULL');
  await addColumnIfMissing('products', 'promo_price', 'DECIMAL(10,2) NULL');
  await addColumnIfMissing('products', 'promo_active', 'TINYINT DEFAULT 0');
  await addColumnIfMissing('products', 'promo_start', 'DATE NULL');
  await addColumnIfMissing('products', 'promo_end', 'DATE NULL');
  await addColumnIfMissing('products', 'bestseller_mode', "VARCHAR(10) DEFAULT 'auto'");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      sort_order INT DEFAULT 0,
      INDEX idx_product_images_product (product_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      pin_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await addColumnIfMissing('customers', 'birth_date', 'DATE NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      customer_phone VARCHAR(20),
      customer_address TEXT,
      slip_image VARCHAR(255),
      customer_id INT,
      bill_number VARCHAR(100),
      order_status VARCHAR(50) DEFAULT 'awaiting_review',
      cancelled_by VARCHAR(20) DEFAULT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(100) PRIMARY KEY,
      value TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      sender ENUM('customer','admin') NOT NULL,
      message_text TEXT,
      image_url VARCHAR(255),
      is_read TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_customer_product (customer_id, product_id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image_url VARCHAR(255) NOT NULL,
      link_product_id INT NULL,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await addColumnIfMissing('banners', 'slot', "VARCHAR(20) DEFAULT 'main'");

  await migrateSizes();
  
  console.log('✅ MySQL tables checked/created');
}

module.exports = { pool, initDb };