-- Estimasi pengiriman (hari) diisi penjual saat memproses pesanan
ALTER TABLE orders ADD COLUMN estimated_days SMALLINT UNSIGNED NULL;
