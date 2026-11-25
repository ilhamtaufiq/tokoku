-- Varian produk: stok dan harga per varian. variant_id = 0 berarti produk tanpa varian.
CREATE TABLE product_variants (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  sku VARCHAR(64) NOT NULL UNIQUE,
  price DECIMAL(15,2) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_variants_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE cart_items
  ADD COLUMN variant_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (user_id, product_id, variant_id);

ALTER TABLE order_items
  ADD COLUMN variant_id BIGINT UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE stock_movements
  ADD COLUMN variant_id BIGINT UNSIGNED NOT NULL DEFAULT 0;
