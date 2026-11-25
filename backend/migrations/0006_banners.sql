-- Banner promo yang diatur admin (ditampilkan sebagai carousel di katalog)
CREATE TABLE banners (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(255) NULL,
  cta_label VARCHAR(60) NULL,
  cta_url VARCHAR(255) NULL,
  image_url VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
