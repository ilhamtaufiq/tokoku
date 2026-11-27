-- Berita acara serah terima (BAST): dibuat pembeli setelah barang diterima. Satu BAST per pesanan.
CREATE TABLE order_bast (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  received_by VARCHAR(120) NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_bast_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  bast_id BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NOT NULL,
  qty_good INT UNSIGNED NOT NULL,
  qty_damaged INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (bast_id) REFERENCES order_bast(id),
  FOREIGN KEY (order_item_id) REFERENCES order_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
