// Data demo untuk tampilan redesain (Stitch). Hanya untuk tampilan.
// Semua nilai di sini adalah dummy dan TIDAK mewakili data toko nyata.
// Dilarang menaruh klaim resmi, status pajak, atau identitas instansi di sini.
// Hapus atau ganti dengan data API ketika fitur tersebut sudah tersedia.

export const DEMO_FLASH_SALE_ENDS_IN = { hours: 4, minutes: 28, seconds: 7 };

export const DEMO_HERO = {
  eyebrow: 'Tahun Ajaran Baru & Digitalisasi Sekolah 2025',
  title: 'Perlengkapan sekolah & elektronik, harga sudah termasuk PPN',
  body: 'Diskon s/d 40% untuk pengadaan laptop, tablet edukasi, dan buku.',
  promoTitle: 'Paket ATK Komplit Murah',
  promoPrice: 'Mulai Rp 12.500',
};

// Tambahan demo untuk struktur halaman Stitch. Semua nilai dummy.

export const DEMO_SHIP_TO = 'SDN 01 Menteng, Jakarta Pusat';

export const DEMO_CURATION_TABS = ['Paling Populer', 'Rekomendasi BOS/BOP', 'Pengiriman Cepat', 'Diskon s/d 40%'];

/** Persentase diskon dummy untuk kartu flash sale (berdasarkan urutan kartu). */
export const DEMO_FLASH_DISCOUNTS = [21, 18, 15, 12];
/** Persentase "terjual" dummy untuk progress stok flash sale. */
export const DEMO_FLASH_SOLD_PCT = [85, 60, 72, 64];

export const DEMO_CITIES = ['Jakarta Timur', 'Jakarta Pusat', 'Surabaya', 'Bandung', 'Semarang', 'Jakarta Barat'];

/** Kota toko dummy, dipilih deterministik dari id produk. */
export function demoCity(seed: number): string {
  return DEMO_CITIES[Math.abs(seed) % DEMO_CITIES.length];
}

/** Rating dan jumlah ulasan dummy, dipilih deterministik dari id produk. */
export function demoRating(seed: number): { score: string; count: number } {
  return {
    score: (4.6 + (Math.abs(seed) % 5) * 0.1).toFixed(1),
    count: 40 + ((Math.abs(seed) * 37) % 400),
  };
}

export const DEMO_NAV_CATEGORIES = [
  { label: 'Buku & Kurikulum Merdeka', q: 'buku' },
  { label: 'Elektronik & Laptop', q: 'laptop' },
  { label: 'Alat Tulis Sekolah (ATK)', q: 'tulis' },
  { label: 'Seragam & Sepatu', q: 'sepatu' },
  { label: 'Laboratorium & Sains', q: 'mikroskop' },
];

export const DEMO_APP_STORES = [
  { icon: 'android', caption: 'Tersedia di', label: 'Google Play Store' },
  { icon: 'phone_iphone', caption: 'Unduh di', label: 'Apple App Store' },
];

// --- Dummy untuk tampilan dokumen (satuan dan berat). Bukan data resmi. ---

/** Satuan barang default untuk dokumen (satuan tidak ada di data pesanan). */
export const DEMO_DOC_UNIT = 'Unit';

/** Berat dummy per baris surat jalan (urutan baris, dipakai bila ada). */
export const DEMO_DOC_ITEM_WEIGHT_GRAM = [2400, 350, 150];

// --- Data tampilan lain. ---

/** Lokasi toko dummy, dipilih dari id toko agar stabil antar render. */
export const DEMO_STORE_LOCATIONS = ['Jakarta Pusat', 'Surabaya', 'Bandung', 'Medan'];

export function demoStoreLocation(storeId: number): string {
  return DEMO_STORE_LOCATIONS[Math.abs(storeId) % DEMO_STORE_LOCATIONS.length];
}

/** Data toko dan produk dummy pada halaman detail produk (API produk belum memuat data toko). */
export const DEMO_PRODUCT_STORE = {
  name: 'Toko Mitra Demo',
  location: 'Jakarta Pusat',
  shipFrom: 'Mulai Rp 18.000',
  shipNote: 'Ongkir tidak kena PPN • Estimasi tiba 1–2 hari',
  condition: 'Baru',
  sold: 'Terjual 450+',
  packageLabel: 'Paket',
  packageOptions: ['Unit saja', '+ Tas & mouse'],
};

/** Jumlah slot galeri tambahan (di luar foto asli produk). */
export const DEMO_GALLERY_EXTRA_SLOTS = 4;

/** Spesifikasi singkat dummy untuk accordion deskripsi. */
export const DEMO_SPECS: { label: string; value: string }[] = [
  { label: 'Kondisi', value: 'Baru, segel pabrik' },
  { label: 'Garansi', value: '1 tahun (contoh)' },
  { label: 'Berat', value: '1,4 kg (contoh)' },
  { label: 'Pengiriman', value: 'Reguler / kargo' },
];

/** Keranjang: catatan kupon. Kode promo sebenarnya diisi di halaman checkout. */
export const DEMO_CART_COUPON_NOTE = 'Kode promo diisi di halaman checkout.';

/** Keranjang dan checkout: kartu bantuan pajak dan BAST. */
export const DEMO_HELP_CARD = {
  title: 'Kendala pajak atau BAST?',
  body: 'Layanan bantuan khusus instansi, 24 jam.',
  button: 'Hubungi',
};

/** Checkout: label alamat. */
export const DEMO_CHECKOUT_ADDRESS = {
  pickNew: 'Pilih alamat lain',
};

/** Checkout: proteksi pengiriman (belum tersedia, tidak masuk total). */
export const DEMO_CHECKOUT_INSURANCE = { label: 'Proteksi pengiriman kargo & kerusakan', note: 'Belum tersedia' };

/** Bagian produk terkait. */
export const DEMO_RELATED = {
  title: 'Pelengkap pengadaan kelas Anda',
  more: 'Lihat semua katalog',
};

/* ---------- Layar admin (Stitch): tren, grafik bulanan, tugas, escrow ---------- */

/** Tren KPI dummy: persentase atau selisih kecil di atas angka KPI dari API. */
export const DEMO_KPI_TREND = {
  revenue: { delta: '+12,4%', note: 'dibanding bulan lalu', up: true, good: true },
  toShip: { delta: '+3', note: 'pesanan baru hari ini', up: true, good: false },
  products: { delta: '+8', note: 'produk baru bulan ini', up: true, good: true },
  lowStock: { delta: '-2', note: 'dibanding minggu lalu', up: false, good: true },
};

/** Penjualan bulanan dummy (rupiah) untuk grafik tren 6 bulan. */
export const DEMO_MONTHLY_SALES: { label: string; value: number }[] = [
  { label: 'Jun', value: 312_500_000 },
  { label: 'Jul', value: 368_900_000 },
  { label: 'Agu', value: 341_200_000 },
  { label: 'Sep', value: 427_600_000 },
  { label: 'Okt', value: 489_300_000 },
  { label: 'Nov', value: 524_800_000 },
];

/** Tugas mendesak dummy untuk panel samping ringkasan. */
export const DEMO_URGENT_TASKS: { title: string; detail: string; due: string; tone: 'danger' | 'warn' | 'info' }[] = [
  { title: 'Kirim pesanan SPJ sekolah', detail: 'INV/2026/TKK/08921 · batas kirim hari ini', due: 'Hari ini 15:00', tone: 'danger' },
];

/** Pengaturan rekening escrow dummy: hanya tampilan, tidak tersimpan. */
export const DEMO_ESCROW = {
  available: 184_450_000,
  held: 58_420_000,
  heldPendingCount: 9,
  bankName: 'Bank Mandiri (Persero) Tbk',
  accountHolder: 'PT Edutech Solusindo Niaga',
  accountMasked: '•••• •••• 8829',
  autoDisburse: true,
  mutations: [
    { at: '17 Nov 2026 · 09:30', ref: 'BAST/2026/SDN01/00829', buyer: 'SDN 01 Menteng', amount: 82_500_000, status: 'Sukses (auto)' },
    { at: '15 Nov 2026 · 14:15', ref: 'BAST/2026/SMAN1/00812', buyer: 'SMAN 1 Kota Bogor', amount: 51_600_000, status: 'Sukses (auto)' },
    { at: '14 Nov 2026 · 11:20', ref: 'BAST/2026/SDK/00801', buyer: 'SDK Penabur Grogol', amount: 18_960_000, status: 'Sukses (manual)' },
  ],
};

// Data dummy untuk halaman pesanan dan akun (redesain kedua, mengikuti Stitch).
// Daftar pesanan dari API belum memuat item dan gambar produk, jadi nama barang di kartu adalah contoh.

export const DEMO_STORE_CITY = 'Jakarta Pusat';

export const DEMO_ORDER_PREVIEW = {
  name: 'Barang pesanan (contoh)',
  variant: 'Varian contoh',
  qty: '1 unit',
};

export const DEMO_SELLER_LINK = 'Hubungi penjual';

export const DEMO_LPJ = {
  title: 'Bantuan & Pendampingan LPJ',
  body: 'Ada kendala pada pesanan, perbedaan fisik laptop, atau revisi lembar BAST? Tim pendamping BOS Tokoku siap 24 jam.',
  consult: 'Konsultasi kendala LPJ BOS',
  complaint: 'Ajukan komplain / retur barang',
};
