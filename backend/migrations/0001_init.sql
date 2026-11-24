-- Skema awal MVP toko online (PKP, harga inklusif PPN, pembayaran Xendit)
-- Semua uang: DECIMAL(15,2). Harga di katalog selalu termasuk PPN.

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) NOT NULL,              -- harga SUDAH termasuk PPN
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 11.00,
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('pkp_enabled', 'true'),
  ('ppn_rate', '11.00'),
  ('shipping_taxable', 'false'),
  ('store_name', 'Toko Online'),
  ('store_npwp', ''),
  ('invoice_prefix', 'INV');

CREATE TABLE promo_codes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(15,2) NOT NULL,
  min_subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  valid_from DATETIME NULL,
  valid_until DATETIME NULL,
  usage_limit INT UNSIGNED NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nomor invoice berurutan per tahun-bulan, dikunci saat dipakai
CREATE TABLE invoice_counters (
  period CHAR(6) PRIMARY KEY,               -- YYYYMM
  last_seq INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  invoice_no VARCHAR(32) NOT NULL UNIQUE,   -- mis. INV/202611/000123
  status ENUM('pending_payment','paid','processing','shipped','completed','cancelled') NOT NULL DEFAULT 'pending_payment',
  payment_status ENUM('unpaid','paid','expired','refunded') NOT NULL DEFAULT 'unpaid',
  subtotal DECIMAL(15,2) NOT NULL,          -- sebelum diskon, termasuk PPN
  discount_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  dpp DECIMAL(15,2) NOT NULL,               -- dasar pengenaan pajak
  ppn_rate DECIMAL(5,2) NOT NULL,           -- snapshot tarif
  ppn_total DECIMAL(15,2) NOT NULL,
  shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0,  -- tidak kena PPN
  grand_total DECIMAL(15,2) NOT NULL,
  shipping_address TEXT NOT NULL,
  buyer_npwp VARCHAR(32) NULL,
  faktur_pajak_no VARCHAR(32) NULL,         -- diisi dari e-Faktur, terpisah dari invoice internal
  xendit_invoice_id VARCHAR(64) NULL UNIQUE,
  xendit_invoice_url VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_orders_status_expires (payment_status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(200) NOT NULL,       -- snapshot
  unit_price DECIMAL(15,2) NOT NULL,        -- snapshot, termasuk PPN
  is_taxable BOOLEAN NOT NULL,              -- snapshot
  qty INT UNSIGNED NOT NULL,
  line_subtotal DECIMAL(15,2) NOT NULL,
  line_discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL,            -- 'xendit'
  external_ref VARCHAR(120) NULL,
  xendit_payment_id VARCHAR(64) NULL,
  payment_channel VARCHAR(32) NULL,         -- mis. BCA, QRIS, OVO
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('pending','settled','failed','expired') NOT NULL,
  raw_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Idempotensi webhook: event yang sama tidak diproses dua kali
CREATE TABLE webhook_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  provider VARCHAR(32) NOT NULL,
  event_id VARCHAR(120) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provider_event (provider, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_movements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  change_qty INT NOT NULL,                  -- negatif = keluar, positif = masuk kembali
  reason VARCHAR(40) NOT NULL,              -- checkout, cancel, expired, adjustment
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
