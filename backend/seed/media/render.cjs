// Membuat ilustrasi produk (SVG -> PNG) dan banner promo untuk data contoh Tokoku.
// Jalankan dari folder ini: node render.cjs
// Membutuhkan paket playwright dan browser Chromium yang sudah terpasang.
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'uploads');
const PRIMARY = '#00288e';
const ACCENT = '#ea580c';
const TINT = '#eef0fb';

// Bentuk sederhana per jenis produk, digambar di kotak 400x400.
function shapeFor(name) {
  const n = name.toLowerCase();
  if (n.includes('headphone') || n.includes('earphone')) {
    return `<path d="M120 230 V190 a80 80 0 0 1 160 0 V230" fill="none" stroke="${PRIMARY}" stroke-width="18" stroke-linecap="round"/>
      <rect x="100" y="215" width="50" height="90" rx="22" fill="${PRIMARY}"/>
      <rect x="250" y="215" width="50" height="90" rx="22" fill="${PRIMARY}"/>`;
  }
  if (n.includes('powerbank')) {
    return `<rect x="110" y="120" width="180" height="170" rx="26" fill="${PRIMARY}"/>
      <rect x="290" y="165" width="14" height="60" rx="6" fill="${PRIMARY}"/>
      <path d="M205 150 L175 215 H200 L190 258 L232 188 H208 Z" fill="${ACCENT}"/>`;
  }
  if (n.includes('mouse') || n.includes('mx master')) {
    return `<rect x="150" y="105" width="100" height="190" rx="50" fill="${PRIMARY}"/>
      <line x1="200" y1="110" x2="200" y2="180" stroke="${TINT}" stroke-width="6"/>
      <rect x="194" y="140" width="12" height="26" rx="6" fill="${ACCENT}"/>`;
  }
  if (n.includes('ransel')) {
    return `<rect x="130" y="100" width="140" height="210" rx="34" fill="${PRIMARY}"/>
      <rect x="160" y="210" width="80" height="70" rx="16" fill="${ACCENT}"/>
      <rect x="165" y="130" width="70" height="14" rx="7" fill="${TINT}"/>`;
  }
  if (n.includes('laptop') && !n.includes('stand')) {
    return `<rect x="105" y="120" width="190" height="130" rx="12" fill="${PRIMARY}"/>
      <rect x="120" y="134" width="160" height="102" rx="6" fill="${TINT}"/>
      <path d="M80 258 H320 L304 282 H96 Z" fill="${PRIMARY}"/>`;
  }
  if (n.includes('keyboard')) {
    let keys = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
      keys += `<rect x="${92 + c * 31}" y="${160 + r * 36}" width="25" height="26" rx="6" fill="${TINT}"/>`;
    }
    return `<rect x="80" y="140" width="240" height="130" rx="18" fill="${PRIMARY}"/>${keys}`;
  }
  if (n.includes('stand')) {
    return `<path d="M120 300 L150 150 H250 L280 300 Z" fill="${PRIMARY}"/>
      <rect x="95" y="290" width="210" height="18" rx="9" fill="${ACCENT}"/>`;
  }
  if (n.includes('hub')) {
    return `<rect x="90" y="170" width="220" height="90" rx="20" fill="${PRIMARY}"/>
      <rect x="120" y="200" width="30" height="22" rx="4" fill="${TINT}"/>
      <rect x="165" y="200" width="30" height="22" rx="4" fill="${TINT}"/>
      <rect x="210" y="200" width="30" height="22" rx="4" fill="${TINT}"/>
      <rect x="255" y="200" width="30" height="22" rx="4" fill="${ACCENT}"/>`;
  }
  if (n.includes('paket buku') || n.includes('buku')) {
    return `<rect x="110" y="250" width="180" height="32" rx="6" fill="${PRIMARY}"/>
      <rect x="125" y="205" width="165" height="40" rx="6" fill="${ACCENT}"/>
      <rect x="105" y="160" width="190" height="40" rx="6" fill="${PRIMARY}"/>`;
  }
  if (n.includes('alat tulis') || n.includes('set alat')) {
    return `<rect x="150" y="130" width="22" height="170" rx="6" transform="rotate(-18 161 215)" fill="${PRIMARY}"/>
      <rect x="200" y="120" width="22" height="180" rx="6" fill="${ACCENT}"/>
      <rect x="250" y="130" width="22" height="170" rx="6" transform="rotate(18 261 215)" fill="${PRIMARY}"/>`;
  }
  return `<rect x="120" y="120" width="160" height="160" rx="22" fill="${PRIMARY}"/>`;
}

function productSvg(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${TINT}"/>
    <ellipse cx="200" cy="318" rx="120" ry="14" fill="#c4c5d5" opacity="0.6"/>
    ${shapeFor(name)}
  </svg>`;
}

function bannerHtml() {
  return `<!doctype html><html><body style="margin:0">
  <div style="width:1600px;height:600px;background:${PRIMARY};position:relative;overflow:hidden">
    <svg style="position:absolute;right:-60px;top:-40px" width="760" height="760" viewBox="0 0 760 760">
      <circle cx="380" cy="380" r="330" fill="${ACCENT}" opacity="0.92"/>
      <circle cx="520" cy="260" r="110" fill="#fff" opacity="0.14"/>
    </svg>
    <svg style="position:absolute;left:-80px;bottom:-120px" width="520" height="520" viewBox="0 0 520 520">
      <circle cx="260" cy="260" r="240" fill="#fff" opacity="0.06"/>
    </svg>
  </div></body></html>`;
}

const PRODUCTS = [
  ['HP-001', 'Earphone Bluetooth Pro'], ['BK-001', 'Buku'], ['TST-001', 'Mouse Wireless'],
  ['ADM-001', 'Powerbank 10000mAh'], ['ADM-574142', 'Powerbank 10000mAh'], ['ADM-614200', 'Powerbank 14209'],
  ['ADM-625069', 'Powerbank 25083'], ['LPT-1404', 'Laptop Asus VivoBook 14'], ['MSE-0303', 'Logitech MX Master 3S'],
  ['KBD-0075', 'Keyboard Mekanikal Keychron K2'], ['AUD-0201', 'Headphone ANC Fokus Belajar'], ['PWR-1001', 'Powerbank 10000mAh'],
  ['ATK-0110', 'Paket Buku Catatan A5 (3 buah)'], ['ATK-0200', 'Set Alat Tulis Lengkap'], ['BAG-0150', 'Ransel Laptop 15 inci'],
  ['ACC-0301', 'Stand Laptop Aluminium'], ['ACC-0310', 'Hub USB-C 6-in-1'],
];
const BANNERS = [
  ['banner-gen-1.png', 'Diskon Awal Semester', 'Perlengkapan sekolah pilihan, harga sudah termasuk PPN'],
  ['banner-gen-2.png', 'Gratis Ongkir Jawa', 'Untuk pembelian di atas Rp300.000'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 600 } });
  for (const [sku, name] of PRODUCTS) {
    await page.setViewportSize({ width: 400, height: 400 });
    await page.setContent(`<html><body style="margin:0">${productSvg(name)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, `gen-${sku}.png`), clip: { x: 0, y: 0, width: 400, height: 400 } });
  }
  await page.setViewportSize({ width: 1600, height: 600 });
  for (const [file] of BANNERS) {
    await page.setContent(bannerHtml());
    await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: 1600, height: 600 } });
  }
  await browser.close();
  console.log('rendered', PRODUCTS.length, 'products and', BANNERS.length, 'banners');
})();
