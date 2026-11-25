-- Media contoh Tokoku: ilustrasi produk dan banner promo.
-- Idempotent: aman dijalankan berulang. Cocokkan produk lewat SKU, banner lewat judul.
-- File gambar harus sudah ada di folder uploads backend (lihat scripts/apply-media-prod.sh).

-- Perbaiki deskripsi yang rusak karena dobel encoding (mis. '•' tersimpan sebagai 'â€¢').
UPDATE products SET description = CONVERT(BINARY CONVERT(description USING latin1) USING utf8mb4)
WHERE HEX(description) LIKE '%C3A2E282AC%';

UPDATE products SET image_url = '/uploads/gen-HP-001.png' WHERE sku = 'HP-001';
UPDATE products SET image_url = '/uploads/gen-BK-001.png' WHERE sku = 'BK-001';
UPDATE products SET image_url = '/uploads/gen-TST-001.png' WHERE sku = 'TST-001';
UPDATE products SET image_url = '/uploads/gen-ADM-001.png' WHERE sku = 'ADM-001';
UPDATE products SET image_url = '/uploads/gen-ADM-574142.png' WHERE sku = 'ADM-574142';
UPDATE products SET image_url = '/uploads/gen-ADM-614200.png' WHERE sku = 'ADM-614200';
UPDATE products SET image_url = '/uploads/gen-ADM-625069.png' WHERE sku = 'ADM-625069';
UPDATE products SET image_url = '/uploads/gen-LPT-1404.png' WHERE sku = 'LPT-1404';
UPDATE products SET image_url = '/uploads/gen-MSE-0303.png' WHERE sku = 'MSE-0303';
UPDATE products SET image_url = '/uploads/gen-KBD-0075.png' WHERE sku = 'KBD-0075';
UPDATE products SET image_url = '/uploads/gen-AUD-0201.png' WHERE sku = 'AUD-0201';
UPDATE products SET image_url = '/uploads/gen-PWR-1001.png' WHERE sku = 'PWR-1001';
UPDATE products SET image_url = '/uploads/gen-ATK-0110.png' WHERE sku = 'ATK-0110';
UPDATE products SET image_url = '/uploads/gen-ATK-0200.png' WHERE sku = 'ATK-0200';
UPDATE products SET image_url = '/uploads/gen-BAG-0150.png' WHERE sku = 'BAG-0150';
UPDATE products SET image_url = '/uploads/gen-ACC-0301.png' WHERE sku = 'ACC-0301';
UPDATE products SET image_url = '/uploads/gen-ACC-0310.png' WHERE sku = 'ACC-0310';

UPDATE banners SET image_url = '/uploads/banner-gen-1.png' WHERE title = 'Diskon Awal Semester';
UPDATE banners SET image_url = '/uploads/banner-gen-2.png' WHERE title = 'Gratis Ongkir Jawa';
