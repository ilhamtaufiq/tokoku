// Data demo untuk tampilan redesain (Stitch). Hanya untuk tampilan.
// Semua nilai di sini adalah dummy dan TIDAK mewakili data toko nyata.
// Hapus atau ganti dengan data API ketika fitur tersebut sudah tersedia.

export const DEMO_FLASH_SALE_ENDS_IN = { hours: 4, minutes: 28, seconds: 7 };

export const DEMO_HERO = {
  eyebrow: 'Tahun Ajaran Baru & Digitalisasi Sekolah 2025',
  title: 'Perlengkapan sekolah & elektronik, harga sudah termasuk PPN',
  body: 'Diskon s/d 40% untuk pengadaan laptop, tablet edukasi, dan buku. Faktur pajak resmi langsung dari penjual.',
  promoTitle: 'Paket ATK Komplit Murah',
  promoPrice: 'Mulai Rp 12.500',
};

export const DEMO_TRUST_BADGES = [
  'Faktur pajak PPN 11% otomatis',
  'Ongkir bebas pengiriman',
  'Produk 100% original',
];

export const DEMO_STORE_LABEL = 'Toko resmi';

// Tambahan demo untuk struktur halaman Stitch. Semua nilai dummy.

export const DEMO_USPS = [
  { icon: 'verified_user', title: 'Faktur Pajak PKP Instan', body: 'Tercatat DJP otomatis & valid', tone: 'text-primary' },
  { icon: 'local_shipping', title: 'Bebas Biaya Pengiriman', body: 'Subsidi s/d 50rb ke 514 kota', tone: 'text-accent' },
  { icon: 'verified', title: '100% Produk Original', body: 'Garansi resmi pabrikan/penerbit', tone: 'text-success' },
  { icon: 'description', title: 'Dukungan Tender & BAST', body: 'Mudah SPK dan LPJ BOS', tone: 'text-primary' },
] as const;

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

export const DEMO_B2B_POINTS = [
  { icon: 'verified', title: 'Kepatuhan Pajak Otomatis', body: 'Setiap transaksi langsung menerbitkan faktur pajak standar tanpa input manual.' },
  { icon: 'local_police', title: 'Sertifikasi Penyalur Resmi', body: 'Seleksi kurasi ketat untuk menjamin orisinalitas produk.' },
];

export const DEMO_PAYMENT_METHODS = ['BCA', 'Mandiri', 'BRI', 'QRIS', 'SPayLater'];

export const DEMO_LOGISTICS_CHIPS = ['J&T Cargo', 'SiCepat', 'JNE REG/YES', 'GoSend'];

export const DEMO_APP_STORES = [
  { icon: 'android', caption: 'Tersedia di', label: 'Google Play Store' },
  { icon: 'phone_iphone', caption: 'Unduh di', label: 'Apple App Store' },
];

/** NPWP contoh (bukan nomor nyata). */
export const DEMO_NPWP = '00.000.000.0-000.000';

// --- Dummy untuk dokumen resmi (faktur, surat pesanan, surat jalan, BAST). ---
// Hanya untuk tampilan cetak. Data dari pesanan (nama, barang, harga, pajak) TIDAK pakai dummy.

/** Nomor seri e-Faktur pajak. */
export const DEMO_TAX_SERIES = '010.002-25.88219012';

/** Kode untuk QR validasi dokumen. */
export const DEMO_QR_CODE = 'DJP-VALIDASI-010002258821';

/** Nilai barcode nomor surat jalan. */
export const DEMO_BARCODE = 'SJ-DEMO-04912';

/** Hash dokumen untuk baris kriptografi di kaki dokumen. */
export const DEMO_DOC_HASH = '8F7E120A4B7D6C5E332A0091BCE421F87D3910A983E31';

/** Kode anggaran dan data sekolah (BOS). */
export const DEMO_BUDGET = {
  source: 'Dana BOS Reguler 2025',
  mak: '5.1.02.01.01.0024',
  kodeAnggaran: 'BOS-REGULER-TA-2025',
  npsn: '20108392',
  id: 'SIPLAH-TKK-99214',
};

/** Rekening virtual account escrow BOS untuk surat pesanan. */
export const DEMO_DOC_VA = {
  bank: 'Bank Mandiri (B2B Escrow BOS)',
  number: '89012-081298765432',
  holder: 'Rekening Escrow Penampungan Belanja BOS',
  method: 'Kopkar / Giro Sekolah / CMS BOS Mandiri',
};

/** Nomor SPK (surat perintah kerja) untuk satu pesanan. */
export function demoSpkNumber(orderId: number): string {
  return `SPK/2025/BOS-JKT/${String(orderId).padStart(5, '0')}`;
}

/** Nomor seri per barang (SN) untuk satu baris pesanan. */
export function demoSerialNo(orderItemId: number): string {
  return `SN-DEMO-${String(orderItemId).padStart(5, '0')}`;
}

/** Penanda kemasan dan berat untuk surat jalan. */
export const DEMO_DOC_LOGISTICS = {
  packing: '1 Koli (Packing kayu segel utuh)',
  weightGram: 2900,
  driver: 'Hendra Kusuma',
  plate: 'B 9421 PCX',
  pickup: 'Pergudangan Edutech Official',
  hub: 'HUB-JKT-04',
  instruction: 'Akses truk / kargo ready di pintu gerbang utama. Wajib periksa keutuhan segel pabrik, kemasan kayu pelindung, dan adaptor sebelum serah terima fisik ditandatangani.',
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
  { title: 'Unggah ulang sertifikat PKP', detail: 'Sertifikat elektronik segera habis masa berlaku', due: 'Dalam 7 hari', tone: 'warn' },
  { title: 'Verifikasi rekening BOS cadangan', detail: 'Rekening BNI belum diverifikasi Kemendikbudristek', due: 'Dalam 14 hari', tone: 'info' },
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

export const DEMO_BUYER_TAG = 'Pengadaan BOS reguler';

export const DEMO_ORDER_PREVIEW = {
  name: 'Barang pesanan (contoh)',
  variant: 'Varian contoh',
  qty: '1 unit',
};

export const DEMO_VA = {
  bank: 'BCA',
  bankName: 'Mandiri Virtual Account Escrow BOS',
  number: '807770812903310',
  refNo: '8992-6192-3841-8921',
  kdl: 'BOS-REG-2025-V2',
};

export const DEMO_SELLER_LINK = 'Hubungi penjual';

export const DEMO_INSTANSI = {
  name: 'SDN 01 Menteng',
  npsn: '20108392',
  pic: 'Budi Santoso, S.Pd',
  picRole: 'Kepala Urusan Tata Usaha',
  phone: '0812-9876-5432',
};

export const DEMO_DRIVER = {
  courierPerson: 'Agus Supriyadi',
  vehicle: 'B 9421 PCX (Mobil box)',
};

export const DEMO_INSURANCE_FEE = '5000';

export const DEMO_LPJ = {
  title: 'Bantuan & Pendampingan LPJ',
  body: 'Ada kendala pada pesanan, perbedaan fisik laptop, atau revisi lembar BAST? Tim pendamping BOS Tokoku siap 24 jam.',
  consult: 'Konsultasi kendala LPJ BOS',
  complaint: 'Ajukan komplain / retur barang',
};

export const DEMO_JAMINAN = {
  title: 'Jaminan Rekonsiliasi SIPLah / RKAS',
  body: 'Seluruh data invoice, NPWP sekolah, dan faktur pajak tersinkronisasi otomatis untuk laporan pertanggungjawaban Dana BOS tanpa selisih.',
};

// ---------------------------------------------------------------------------
// Tambahan redesain pass 2 (keranjang, checkout, produk): data pelengkap yang belum ada di API.
// ---------------------------------------------------------------------------

/** Lokasi toko dummy, dipilih dari id toko agar stabil antar render. */
export const DEMO_STORE_LOCATIONS = ['Jakarta Pusat', 'Surabaya', 'Bandung', 'Medan'];

export function demoStoreLocation(storeId: number): string {
  return DEMO_STORE_LOCATIONS[Math.abs(storeId) % DEMO_STORE_LOCATIONS.length];
}

/** Data toko dan produk dummy pada halaman detail produk (API produk belum memuat data toko). */
export const DEMO_PRODUCT_STORE = {
  name: 'Toko Mitra Demo',
  location: 'Jakarta Pusat',
  pkp: 'PKP terverifikasi',
  banner: 'Toko resmi • PKP',
  shipFrom: 'Mulai Rp 18.000',
  shipNote: 'Ongkir tidak kena PPN • Estimasi tiba 1–2 hari',
  warranty: 'Garansi resmi 1 tahun',
  condition: 'Baru',
  sold: 'Terjual 450+',
  efaktur: 'e-Faktur otomatis & siap BAST BOS',
  packageLabel: 'Paket',
  packageOptions: ['Unit saja', '+ Tas & mouse'],
};

/** Jumlah slot galeri tambahan (di luar foto asli produk). */
export const DEMO_GALLERY_EXTRA_SLOTS = 4;

/** Spesifikasi singkat dummy untuk accordion deskripsi. */
export const DEMO_SPECS: { label: string; value: string }[] = [
  { label: 'Kondisi', value: 'Baru, segel pabrik' },
  { label: 'Garansi', value: 'Resmi 1 tahun' },
  { label: 'Berat', value: '1,4 kg (contoh)' },
  { label: 'Pengiriman', value: 'Reguler / kargo' },
];

/** Label sumber dana pada setiap ulasan (belum ada di API). */
export const DEMO_REVIEW_TAG = 'Dana BOS';

/** Keranjang: banner kesiapan pengadaan. */
export const DEMO_CART_BANNER = {
  title: 'Siap pengadaan BOS & dokumen perpajakan lengkap',
  tag: 'Sesuai juknis 2025',
  body: 'Sistem menyiapkan draf BAST, SPK digital, dan e-Faktur terdaftar DJP otomatis setelah pelunasan.',
};

/** Pita kepatuhan di atas keranjang dan checkout. */
export const DEMO_COMPLIANCE_BANNER = {
  cart: 'Kepatuhan fiskal terjamin',
  checkout: 'Faktur pajak & e-Bupot otomatis diterbitkan',
  tag: 'PPN 11% PKP',
};

/** Keranjang: catatan kupon. Kode promo sebenarnya diisi di halaman checkout. */
export const DEMO_CART_COUPON_NOTE = 'Kode promo diisi di halaman checkout.';

/** Keranjang: kartu surat penawaran resmi (SPH). */
export const DEMO_SPH = {
  title: 'Butuh surat penawaran resmi (SPH)?',
  body: 'Unduh dokumen penawaran harga resmi bertanda tangan digital untuk kelengkapan administrasi SPK sekolah.',
  button: 'Unduh draf SPH (.PDF)',
};

/** Keranjang: kartu jaminan rekening institusi. */
export const DEMO_CART_ESCROW = {
  title: 'Jaminan keamanan rekening institusi',
  body: 'Dana pembayaran disimpan di rekening penampungan dan diteruskan ke penjual setelah pesanan dikonfirmasi.',
  tags: ['Escrow protected', 'DJP connected'],
};

/** Keranjang dan checkout: kartu bantuan pajak dan BAST. */
export const DEMO_HELP_CARD = {
  title: 'Kendala pajak atau BAST?',
  body: 'Layanan bantuan khusus instansi, 24 jam.',
  button: 'Hubungi',
};

/** Checkout: label alamat dan NPWP. */
export const DEMO_CHECKOUT_ADDRESS = {
  pickNew: 'Pilih alamat lain',
  schoolTag: 'Alamat instansi',
  mainTag: 'Alamat pengadaan utama',
  truckReady: 'Akses truk / kargo',
  npwpCaption: 'NPWP instansi untuk e-Faktur',
};

/** Checkout: opsi dokumen BOS. */
export const DEMO_BOS_DOCS = {
  title: 'Dokumen pertanggungjawaban BOS',
  body: 'Kirim BAST & surat pesanan fisik bermaterai via POS dan salinan digital instan lewat email sekolah.',
  format: 'Format BAST sesuai standar Kemendikbudristek',
};

/** Checkout: metode pembayaran yang tampil sebagai contoh (pemilihan sebenarnya di Midtrans). */
export const DEMO_PAYMENT_CHIPS = ['VA Bank BJB', 'Mandiri B2B', 'BRI Escrow', 'QRIS BAST'];

/** Checkout: kartu metode pembayaran. */
export const DEMO_PAYMENT_CARD = {
  tag: 'Escrow resmi',
  caption: 'Rekening penampungan khusus belanja satuan pendidikan',
};

/** Checkout: proteksi pengiriman (belum tersedia, tidak masuk total). */
export const DEMO_CHECKOUT_INSURANCE = { label: 'Proteksi pengiriman kargo & kerusakan', note: 'Belum tersedia' };

/** Checkout: label kecil pada kartu toko. */
export const DEMO_STORE_TAGS = { official: 'Toko resmi', pkp: 'PKP' };

/** Bagian produk terkait. */
export const DEMO_RELATED = {
  title: 'Pelengkap pengadaan kelas Anda',
  body: 'Produk pelengkap yang sering dibeli bersamaan oleh sekolah dan instansi PKP sejenis.',
  more: 'Lihat semua katalog',
};
