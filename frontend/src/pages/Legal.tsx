import { useSeo } from '../lib/seo';
/** Halaman legal. Teks di bawah adalah KERANGKA. Isi bagian bertanda [..] dengan data usaha yang sebenarnya dan tinjau bersama penasihat hukum. */
const Draft = () => (
  <p className="draft-note">Draf awal. Belum ditinjau oleh penasihat hukum. Ganti bagian dalam kurung siku sebelum publikasi.</p>
);

export function Terms() {
  useSeo({ title: 'Syarat dan Ketentuan', description: 'Syarat dan ketentuan penggunaan dan pembelian di Tokoku.', canonicalPath: '/syarat' });
  return (
    <article className="legal">
      <h1>Syarat dan Ketentuan</h1>
      <Draft />
      <h2>1. Identitas penjual</h2>
      <p>Tokoku dioperasikan oleh [nama badan usaha/pemilik], NPWP [nomor], alamat [alamat lengkap], telepon [nomor], email [email kontak].</p>
      <h2>2. Harga dan pajak</h2>
      <p>Harga yang tercantum sudah termasuk Pajak Pertambahan Nilai (PPN) sesuai ketentuan yang berlaku. Rincian DPP dan PPN ditampilkan pada keranjang, checkout, dan invoice. Ongkos kirim tidak dikenai PPN.</p>
      <h2>3. Pemesanan dan pembayaran</h2>
      <p>Pesanan dianggap sah setelah pembayaran diterima melalui Midtrans. Pesanan yang tidak dibayar dalam 24 jam dibatalkan otomatis dan stok dikembalikan. [Metode pembayaran yang tersedia].</p>
      <h2>4. Pengiriman</h2>
      <p>Pengiriman dilakukan ke alamat yang diisi pembeli. [Estimasi waktu pengiriman, ekspedisi yang digunakan, dan tanggung jawab risiko].</p>
      <h2>5. Akun</h2>
      <p>Pembeli bertanggung jawab menjaga kerahasiaan akun dan data yang dimasukkan.</p>
    </article>
  );
}

export function Privacy() {
  useSeo({ title: 'Kebijakan Privasi', description: 'Bagaimana Tokoku mengumpulkan, menggunakan, dan melindungi data pribadi Anda.', canonicalPath: '/privasi' });
  return (
    <article className="legal">
      <h1>Kebijakan Privasi</h1>
      <Draft />
      <h2>1. Data yang kami kumpulkan</h2>
      <p>Nama, alamat email, alamat pengiriman, nomor telepon, NPWP (jika diisi), dan riwayat pesanan. Data pembayaran diproses oleh Midtrans dan tidak disimpan di server kami.</p>
      <h2>2. Tujuan penggunaan</h2>
      <p>Memproses pesanan, pengiriman, pembuatan invoice dan dokumen pajak, layanan pelanggan, dan kepatuhan terhadap kewajiban hukum.</p>
      <h2>3. Pihak ketiga</h2>
      <p>Data dibagikan kepada Midtrans (pembayaran) dan ekspedisi (pengiriman) sebatas yang diperlukan untuk layanan tersebut.</p>
      <h2>4. Hak Anda</h2>
      <p>Anda berhak meminta akses, koreksi, atau penghapusan data pribadi Anda sesuai Undang-Undang Pelindungan Data Pribadi. Hubungi [email kontak].</p>
      <h2>5. Keamanan</h2>
      <p>Kata sandi disimpan dalam bentuk hash. Komunikasi dilindungi HTTPS. [Uraikan kebijakan retensi data].</p>
    </article>
  );
}

export function Refund() {
  useSeo({ title: 'Kebijakan Pengembalian Dana', description: 'Ketentuan pembatalan dan pengembalian dana pesanan di Tokoku.', canonicalPath: '/pengembalian' });
  return (
    <article className="legal">
      <h1>Kebijakan Pengembalian Dana</h1>
      <Draft />
      <h2>1. Pembatalan</h2>
      <p>Pesanan yang belum dikirim dapat dibatalkan oleh admin dan dana dikembalikan ke metode pembayaran semula. [Batas waktu pengajuan pembatalan oleh pembeli].</p>
      <h2>2. Barang rusak atau tidak sesuai</h2>
      <p>Hubungi kami dalam [jumlah] hari sejak barang diterima dengan melampirkan bukti. [Prosedur penukaran atau pengembalian dana].</p>
      <h2>3. Waktu pengembalian dana</h2>
      <p>Pengembalian dana diproses dalam [jumlah] hari kerja setelah disetujui.</p>
    </article>
  );
}
