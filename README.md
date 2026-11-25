# Toko Online

Aplikasi toko online dengan backend Rust (Axum + SQLx), database MariaDB, dan frontend React.
Harga produk sudah termasuk PPN (PKP), ongkir tidak kena PPN, pembayaran lewat Midtrans (Snap).

## Menjalankan dengan Docker

```bash
cp .env.example .env
docker compose up --build
```

- Backend: http://localhost:8080/healthz
- Readiness (cek DB): http://localhost:8080/readyz

## Menjalankan backend lokal (tanpa Docker)

Butuh MariaDB 10.6+ atau MySQL 8 yang sudah berjalan.

```bash
cd backend
DATABASE_URL="mysql://toko:toko_secret@127.0.0.1:3306/toko_online" cargo run
```

Migrasi database dijalankan otomatis saat server start (folder `backend/migrations`).

## Membuat admin pertama

```bash
cd backend
cargo run -- create-admin admin@toko.test "Admin Toko" "password_minimal_8"
```

## Endpoint utama

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/register` | publik | Daftar (password min. 8) |
| POST | `/api/auth/login` | publik | Access token di body, refresh token di cookie HttpOnly |
| POST | `/api/auth/refresh` | cookie | Access token baru |
| POST | `/api/auth/logout` | publik | Hapus cookie refresh |
| GET | `/api/auth/me` | login | Profil user |
| GET | `/api/categories` | publik | Daftar kategori |
| GET | `/api/products?q=&category_id=&page=&per_page=` | publik | Katalog (hanya produk aktif) |
| GET | `/api/products/{id}` | publik | Detail produk + PPN yang sudah termasuk |
| POST | `/api/pricing/preview` | publik | Rincian DPP, PPN, ongkir, dan total (+ `promo_code` opsional) |
| GET/PUT/DELETE | `/api/cart[/items[/{product_id}]]` | login | Keranjang server-side (qty 0 = hapus) |
| POST | `/api/orders` | login | Checkout: stok dikunci, promo, nomor invoice, transaksi Midtrans Snap |
| GET | `/api/orders[/{id}]` | login | Riwayat dan detail pesanan milik sendiri |
| POST | `/api/orders/{id}/pay` | login | Ambil/buat ulang URL pembayaran |
| POST | `/api/webhooks/midtrans` | signature SHA512 | Notifikasi pembayaran dari Midtrans |
| GET | `/api/admin/orders?status=` | admin | Daftar semua pesanan |
| PATCH | `/api/admin/orders/{id}/status` | admin | paid → processing → shipped → completed |
| POST | `/api/admin/promos` | admin | Buat kode promo (percent atau fixed) |
| POST/PUT/DELETE | `/api/admin/products[/{id}]` | admin | CRUD produk (DELETE = nonaktifkan) |
| POST | `/api/admin/categories` | admin | Tambah kategori |

Harga dan nilai uang dikirim sebagai **string** (mis. `"111000.00"`) agar tidak ada masalah pembulatan float.

## Pembayaran Midtrans (Snap)

1. Ambil **Server Key** dari dashboard Midtrans (sandbox: `SB-Mid-server-...`) dan isi `MIDTRANS_SERVER_KEY`. Jangan commit kunci ini ke repo.
2. `MIDTRANS_ENV=sandbox` untuk uji coba, `production` untuk live.
3. Di dashboard Midtrans, atur **Payment Notification URL** ke `https://<domain>/api/webhooks/midtrans`.

Alur: checkout membuat transaksi Snap dan mengarahkan pembeli ke halaman pembayaran Midtrans. Setelah notifikasi masuk, signature SHA512 diverifikasi, lalu status diambil ulang dari Core API sebelum pesanan ditandai lunas.

Job latar belakang:
- Setiap 60 detik: pesanan yang lewat 24 jam dan belum dibayar dibatalkan, stok dikembalikan.
- Setiap 5 menit: rekonsiliasi status transaksi yang masih menunggu pembayaran.

## Data dummy produk (demo)

Skrip `backend/seed/dummy_products.sql` menambahkan 3 kategori dan 10 produk contoh. Aman dijalankan berulang.

Di server (Coolify), jalankan di folder compose:

```bash
docker compose exec -T db sh -c 'mariadb -u root -p"$MARIADB_ROOT_PASSWORD" toko_online' < backend/seed/dummy_products.sql
```

Produk contoh tidak punya gambar, sehingga tampil dengan placeholder huruf. Gambar bisa diunggah dari panel admin.

## Struktur

```
backend/     API Rust (Axum, SQLx)
frontend/    React (Vite, TypeScript) — Fase 7
```

Lihat rencana lengkap di dokumen perancangan.
