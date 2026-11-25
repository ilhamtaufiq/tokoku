#!/usr/bin/env bash
# Menerapkan gambar produk dan banner contoh ke deployment produksi (Docker Compose di Coolify).
#
# Yang dilakukan:
#   1. Menyalin backend/seed/media/uploads/* ke volume uploads di container backend.
#   2. Menjalankan backend/seed/media.sql di database (aman dijalankan ulang).
#
# Cara pakai (di server, di folder yang berisi docker-compose.yml):
#   bash scripts/apply-media-prod.sh
#
# Prasyarat: service "backend" dan "db" sedang berjalan, dan variabel MARIADB_ROOT_PASSWORD
# tersedia di container db (sama seperti perintah seed di README).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d backend/seed/media/uploads ] || [ ! -f backend/seed/media.sql ]; then
  echo "File media tidak ditemukan. Jalankan dari repo yang lengkap." >&2
  exit 1
fi

echo "==> Menyalin gambar ke container backend"
docker compose exec -T backend sh -c 'mkdir -p /app/uploads'
docker compose cp backend/seed/media/uploads/. backend:/app/uploads/

echo "==> Menerapkan media.sql ke database"
docker compose exec -T db sh -c 'mariadb --default-character-set=utf8mb4 -u root -p"$MARIADB_ROOT_PASSWORD" toko_online' < backend/seed/media.sql

echo "==> Verifikasi"
docker compose exec -T db sh -c 'mariadb --default-character-set=utf8mb4 -u root -p"$MARIADB_ROOT_PASSWORD" toko_online -e "SELECT COUNT(*) AS produk_bergambar FROM products WHERE image_url LIKE '\''/uploads/gen-%'\'';"'
echo "Selesai. Buka halaman produk untuk memastikan gambar tampil."
