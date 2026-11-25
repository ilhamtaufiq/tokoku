-- Pilih barang di keranjang: hanya barang yang dipilih ikut checkout
ALTER TABLE cart_items ADD COLUMN selected BOOLEAN NOT NULL DEFAULT TRUE;
