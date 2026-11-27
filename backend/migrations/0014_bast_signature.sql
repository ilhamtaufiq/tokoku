-- Tanda tangan penerima (PNG data URL), dan tindak lanjut penjual atas kerusakan.
ALTER TABLE order_bast
  ADD COLUMN signature_png MEDIUMTEXT NULL,
  ADD COLUMN seller_note VARCHAR(500) NULL,
  ADD COLUMN seller_responded_at DATETIME NULL;
