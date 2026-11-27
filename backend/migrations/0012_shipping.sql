-- Ongkir RajaOngkir (Komerce). Berat produk dalam gram; lokasi asal per toko; pilihan kurir per pesanan.
ALTER TABLE products ADD COLUMN weight_grams INT UNSIGNED NOT NULL DEFAULT 1000;

ALTER TABLE stores
  ADD COLUMN origin_location_id BIGINT UNSIGNED NULL,
  ADD COLUMN origin_label VARCHAR(255) NULL;

ALTER TABLE orders
  ADD COLUMN destination_id BIGINT UNSIGNED NULL,
  ADD COLUMN destination_label VARCHAR(255) NULL,
  ADD COLUMN courier VARCHAR(16) NULL,
  ADD COLUMN courier_service VARCHAR(64) NULL,
  ADD COLUMN shipping_etd VARCHAR(32) NULL;
