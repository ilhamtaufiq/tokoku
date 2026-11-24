# Toko Online

Aplikasi toko online dengan backend Rust (Axum + SQLx), database MariaDB, dan frontend React.
Harga produk sudah termasuk PPN (PKP), ongkir tidak kena PPN, pembayaran lewat Xendit.

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
| POST | `/api/orders` | login | Checkout: stok dikunci, promo, nomor invoice, invoice Xendit |
| GET | `/api/orders[/{id}]` | login | Riwayat dan detail pesanan milik sendiri |
| POST | `/api/orders/{id}/pay` | login | Ambil/buat ulang URL pembayaran |
| POST | `/api/webhooks/xendit` | callback token | Notifikasi pembayaran dari Xendit |
| GET | `/api/admin/orders?status=` | admin | Daftar semua pesanan |
| PATCH | `/api/admin/orders/{id}/status` | admin | paid → processing → shipped → completed |
| POST | `/api/admin/promos` | admin | Buat kode promo (percent atau fixed) |
| POST/PUT/DELETE | `/api/admin/products[/{id}]` | admin | CRUD produk (DELETE = nonaktifkan) |
| POST | `/api/admin/categories` | admin | Tambah kategori |

Harga dan nilai uang dikirim sebagai **string** (mis. `"111000.00"`) agar tidak ada masalah pembulatan float.

## Pembayaran Xendit

1. Di dashboard Xendit, atur **Webhook URL** untuk invoice ke `https://<domain-backend>/api/webhooks/xendit`.
2. Salin **Callback Token** ke `XENDIT_CALLBACK_TOKEN`, dan secret key ke `XENDIT_SECRET_KEY`.
3. Untuk pengembangan lokal tanpa akun Xendit, gunakan mock:

```bash
python3 tools/mock_xendit.py            # port 3999
# backend dengan:
#   XENDIT_BASE_URL=http://127.0.0.1:3999 XENDIT_SECRET_KEY=xnd_dev_mock XENDIT_CALLBACK_TOKEN=mock_callback_token
curl -X POST http://127.0.0.1:3999/_mock/paid/<invoice_id>     # simulasi bayar
curl -X POST http://127.0.0.1:3999/_mock/expire/<invoice_id>   # simulasi kedaluwarsa
```

Status pembayaran selalu diambil ulang dari API Xendit sebelum diterapkan, jadi webhook palsu tidak bisa menandai pesanan lunas.

Job latar belakang:
- Setiap 60 detik: pesanan yang lewat 24 jam dan belum dibayar dibatalkan, stok dikembalikan.
- Setiap 5 menit: rekonsiliasi status invoice yang masih menunggu pembayaran (jika webhook gagal terkirim).

## Struktur

```
backend/     API Rust (Axum, SQLx)
frontend/    React (Vite, TypeScript) — Fase 7
```

Lihat rencana lengkap di dokumen perancangan.
