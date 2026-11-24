-- Invoice cetak, nomor resi, refund manual, dan gambar produk

ALTER TABLE orders
  ADD COLUMN tracking_number VARCHAR(64) NULL,
  ADD COLUMN shipped_at DATETIME NULL,
  ADD COLUMN cancelled_at DATETIME NULL,
  ADD COLUMN refund_note VARCHAR(500) NULL;

ALTER TABLE products
  ADD COLUMN image_url VARCHAR(500) NULL;

INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('store_address', ''),
  ('store_phone', '');
