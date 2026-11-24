-- Fase 5–6: keranjang server-side, pesanan, promo, dan pembayaran Xendit

CREATE TABLE cart_items (
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('shipping_flat_fee', '20000');

ALTER TABLE orders
  ADD COLUMN promo_code VARCHAR(40) NULL,
  ADD COLUMN paid_at DATETIME NULL;
