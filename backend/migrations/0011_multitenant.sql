-- Multi-toko (tenant). Data yang sudah ada dipindahkan ke toko default id=1.

-- Peran penjual. 'admin' tetap berarti admin platform.
ALTER TABLE users MODIFY COLUMN role ENUM('customer','admin','seller') NOT NULL DEFAULT 'customer';

CREATE TABLE stores (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  npwp VARCHAR(32) NOT NULL DEFAULT '',
  address TEXT NULL,
  phone VARCHAR(32) NOT NULL DEFAULT '',
  shipping_flat_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
  invoice_prefix VARCHAR(16) NOT NULL,
  status ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_prefix (invoice_prefix),
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Toko default: pemilik = admin pertama, data toko diambil dari app_settings.
INSERT INTO stores (id, owner_user_id, slug, name, npwp, address, phone, shipping_flat_fee, invoice_prefix, status)
SELECT 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'tokoku',
  COALESCE((SELECT setting_value FROM app_settings WHERE setting_key = 'store_name'), 'Tokoku'),
  COALESCE((SELECT setting_value FROM app_settings WHERE setting_key = 'store_npwp'), ''),
  COALESCE((SELECT setting_value FROM app_settings WHERE setting_key = 'store_address'), ''),
  COALESCE((SELECT setting_value FROM app_settings WHERE setting_key = 'store_phone'), ''),
  COALESCE((SELECT CAST(setting_value AS DECIMAL(15,2)) FROM app_settings WHERE setting_key = 'shipping_flat_fee'), 0),
  COALESCE((SELECT setting_value FROM app_settings WHERE setting_key = 'invoice_prefix'), 'INV'),
  'active';

ALTER TABLE products
  ADD COLUMN store_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  ADD INDEX idx_products_store (store_id),
  ADD FOREIGN KEY fk_products_store (store_id) REFERENCES stores(id);

ALTER TABLE orders
  ADD COLUMN store_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  ADD INDEX idx_orders_store (store_id),
  ADD FOREIGN KEY fk_orders_store (store_id) REFERENCES stores(id);

-- Banner: NULL = banner platform (tampil di katalog semua toko)
ALTER TABLE banners
  ADD COLUMN store_id BIGINT UNSIGNED NULL,
  ADD FOREIGN KEY fk_banners_store (store_id) REFERENCES stores(id);

-- Promo sekarang milik satu toko; kode unik per toko
ALTER TABLE promo_codes
  ADD COLUMN store_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  DROP INDEX code,
  ADD UNIQUE KEY uq_promo_store_code (store_id, code),
  ADD FOREIGN KEY fk_promo_store (store_id) REFERENCES stores(id);

-- Penomoran invoice per toko
ALTER TABLE invoice_counters
  ADD COLUMN store_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (store_id, period);

ALTER TABLE audit_logs
  ADD COLUMN store_id BIGINT UNSIGNED NULL,
  ADD INDEX idx_audit_store (store_id);
