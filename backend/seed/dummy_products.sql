-- Data dummy katalog untuk demo. Aman dijalankan berulang (idempotent).
-- Semua harga sudah termasuk PPN dan dalam rupiah bulat.
-- Jalankan di server (contoh Coolify):
--   docker compose exec -T db mariadb -u root -p"$DB_ROOT_PASSWORD" toko_online < backend/seed/dummy_products.sql

INSERT INTO categories (name, slug) VALUES
  ('Elektronik', 'elektronik'),
  ('Perlengkapan Sekolah', 'perlengkapan-sekolah'),
  ('Aksesori', 'aksesori')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'LPT-1404', 'Laptop Asus VivoBook 14', 'Intel Core i5-1335U • RAM 16GB • SSD 512GB • Layar 14 inci Full HD', 8499000, 11.00, TRUE, 14, TRUE
FROM categories WHERE slug = 'elektronik'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'MSE-0303', 'Logitech MX Master 3S', 'Mouse ergonomis • 8000 DPI • Klik senyap • USB-C & Bluetooth', 1549000, 11.00, TRUE, 25, TRUE
FROM categories WHERE slug = 'elektronik'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'KBD-0075', 'Keyboard Mekanikal Keychron K2', 'Layout 75% • Switch Gateron • Nirkabel Bluetooth & kabel USB-C', 1299000, 11.00, TRUE, 3, TRUE
FROM categories WHERE slug = 'elektronik'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'AUD-0201', 'Headphone ANC Fokus Belajar', 'Peredam bising aktif • Baterai 30 jam • Mikrofon untuk kelas daring', 1299000, 11.00, TRUE, 9, TRUE
FROM categories WHERE slug = 'elektronik'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'PWR-1001', 'Powerbank 10000mAh', 'Kapasitas 10000mAh • USB-C PD 20W • Ringkas untuk dibawa ke sekolah', 249000, 11.00, TRUE, 40, TRUE
FROM categories WHERE slug = 'elektronik'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'ATK-0110', 'Paket Buku Catatan A5 (3 buah)', 'Kertas grid 100gsm • 80 lembar per buku • Sampul softcover', 125000, 11.00, TRUE, 60, TRUE
FROM categories WHERE slug = 'perlengkapan-sekolah'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'ATK-0200', 'Set Alat Tulis Lengkap', 'Pulpen gel, pensil, penghapus, penggaris, dan rautan dalam satu kotak', 89000, 11.00, TRUE, 80, TRUE
FROM categories WHERE slug = 'perlengkapan-sekolah'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'BAG-0150', 'Ransel Laptop 15 inci', 'Muat laptop 15 inci • Bahan anti air • Banyak kompartemen', 389000, 11.00, TRUE, 5, TRUE
FROM categories WHERE slug = 'perlengkapan-sekolah'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'ACC-0301', 'Stand Laptop Aluminium', 'Bahan aluminium • Dapat diatur tinggi • Sirkulasi udara baik', 179000, 11.00, TRUE, 18, TRUE
FROM categories WHERE slug = 'aksesori'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock, is_active)
SELECT id, 'ACC-0310', 'Hub USB-C 6-in-1', 'HDMI 4K • 2× USB-A • Kartu SD/microSD • Power delivery 100W', 329000, 11.00, TRUE, 0, TRUE
FROM categories WHERE slug = 'aksesori'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);
