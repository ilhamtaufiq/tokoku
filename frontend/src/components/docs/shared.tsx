import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { OrderDetail } from '../../api/types';
import { formatDate } from '../../lib/money';
import { useAuth } from '../../auth/AuthContext';

/**
 * Kertas dokumen: selalu putih dan berwarna gelap, termasuk mode gelap, agar aman dicetak.
 * Warna identitas tiap dokumen dikirim lewat `accent` sebagai bilah atas tebal (seperti Stitch).
 */
export function Paper({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <article className="relative mx-auto w-full max-w-[960px] overflow-hidden rounded-card border border-outline-soft bg-white p-4 font-body text-[#1a1b22] shadow-[0_8px_24px_rgb(0_23_92/0.08)] sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <div className="mb-6 h-2 w-full rounded-full print:mb-4" style={{ background: accent }} aria-hidden="true" />
      {children}
    </article>
  );
}

/** Bilah aksi di atas dokumen. Tidak ikut tercetak. */
export function DocToolbar({ orderId, active }: { orderId: number; active: 'invoice' | 'sp' | 'sj' | 'bast' }) {
  const { user } = useAuth();
  const back = user?.role === 'seller' ? `/admin/orders/${orderId}` : `/orders/${orderId}`;
  const tabs: { key: typeof active; to: string; label: string }[] = [
    { key: 'invoice', to: `/orders/${orderId}/invoice`, label: 'Invoice' },
    { key: 'sp', to: `/orders/${orderId}/surat-pesanan`, label: 'Surat pesanan' },
    { key: 'sj', to: `/orders/${orderId}/surat-jalan`, label: 'Surat jalan' },
    { key: 'bast', to: `/orders/${orderId}/bast`, label: 'BAST' },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link to={back} className="text-sm font-semibold text-primary no-underline hover:underline">← Kembali ke pesanan</Link>
      <nav className="flex flex-wrap gap-1.5" aria-label="Dokumen">
        {tabs.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`h-8 rounded-pill border px-3 text-[13px] font-semibold leading-8 no-underline ${
              t.key === active ? 'border-primary bg-secondary-container text-on-secondary-container' : 'border-outline bg-surface text-ink-2'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="h-9 rounded-pill bg-primary px-4 text-sm font-semibold text-on-primary" onClick={() => window.print()}>
        Cetak / simpan PDF
      </button>
    </div>
  );
}

/**
 * Bilah status di atas kertas (seperti Stitch). Tidak ikut tercetak.
 * `icon` adalah nama Material Symbols, `actions` berisi tombol cetak.
 */
export function DocBanner({
  icon,
  title,
  subtitle,
  badges,
  actions,
}: {
  icon: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card bg-white p-4 shadow-sm print:hidden">
      <div className="flex min-w-0 items-start gap-3">
        <span className="material-symbols-outlined flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary-fixed text-[22px] text-primary" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-bold text-[#1a1b22]">{title}</span>
            {badges}
          </div>
          {subtitle && <p className="m-0 mt-0.5 text-xs text-[#5b5e6e]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Lencana kecil (pill) di dalam kepala dokumen. */
export function DocBadge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}

/** Blok merek penerbit: kotak huruf, nama, dan lencana. */
export function BrandMark({ letter = 'T', name, badge, badgeClass = 'bg-[#eff4ff] text-[#00288e]' }: { letter?: string; name: string; badge?: string; badgeClass?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[#00288e] font-display text-lg font-bold text-white" aria-hidden="true">{letter}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-display text-base font-black uppercase tracking-tight text-[#00288e]">{name}</span>
          {badge && <DocBadge className={badgeClass}>{badge}</DocBadge>}
        </div>
      </div>
    </div>
  );
}

/** Bilah judul berwarna di atas tabel atau kartu (warna identitas dokumen). */
export function SectionBar({ icon, title, right, color }: { icon?: string; title: string; right?: ReactNode; color: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-card px-4 py-2.5 text-white" style={{ background: color }}>
      <div className="flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{icon}</span>}
        <span className="font-display text-[12px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      {right && <span className="font-mono text-[10px] font-semibold uppercase tracking-wider opacity-90">{right}</span>}
    </div>
  );
}

/** Identitas toko penerbit dokumen (diambil dari pesanan, karena setiap pesanan milik satu toko). */
export function StoreBlock({ order }: { order: OrderDetail }) {
  return (
    <div className="text-sm text-[#1a1b22]">
      <strong className="font-display text-base font-bold">{order.store_name || 'Nama toko belum diatur'}</strong>
      {order.store_npwp && <p className="m-0 font-mono text-xs">NPWP: {formatNpwp(order.store_npwp)}</p>}
      {order.store_address && <p className="m-0 whitespace-pre-line">{order.store_address}</p>}
      {order.store_phone && <p className="m-0">Telp: {order.store_phone}</p>}
    </div>
  );
}

export function formatNpwp(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 15) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12)}`;
  return raw;
}

export function docDate(iso: string) {
  return formatDate(iso);
}

/** Warna identitas per dokumen untuk garis tanda tangan dan judul blok. */
export const DOC_TONE = {
  navy: { line: 'border-[#00288e]', text: 'text-[#00288e]', color: '#00288e' },
  orange: { line: 'border-[#ea580c]', text: 'text-[#c2410c]', color: '#ea580c' },
  slate: { line: 'border-[#334155]', text: 'text-[#334155]', color: '#334155' },
  green: { line: 'border-[#15803d]', text: 'text-[#15803d]', color: '#15803d' },
} as const;

export type DocTone = keyof typeof DOC_TONE;

/** Kolom tanda tangan: judul berwarna dokumen, ruang tanda tangan, garis, lalu nama. */
export function SignatureBox({
  title,
  name,
  sub,
  dateLabel,
  tone = 'slate',
  signature,
}: {
  title: string;
  name: string;
  sub?: ReactNode;
  dateLabel?: string;
  tone?: DocTone;
  signature?: ReactNode;
}) {
  const t = DOC_TONE[tone];
  return (
    <div className="flex flex-col gap-1 text-center text-sm text-[#1a1b22]">
      <p className={`m-0 font-display text-xs font-bold uppercase tracking-wider ${t.text}`}>{title}</p>
      <div className="flex h-16 items-end justify-center">{signature}</div>
      <div className={`border-t-2 pt-1.5 ${t.line}`}>
        <p className="m-0 font-display font-bold">{name}</p>
        {sub && <p className="m-0 font-mono text-[11px] text-[#5b5e6e]">{sub}</p>}
      </div>
      {dateLabel && <p className="m-0 font-mono text-xs text-[#5b5e6e]">{dateLabel}</p>}
    </div>
  );
}

/** Label kecil di atas nilai, dipakai pada kartu item versi mobile. */
export function MiniLabel({ children }: { children: ReactNode }) {
  return <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5b5e6e]">{children}</span>;
}

/** Stempel bundar atau persegi bergaya cetak (dekoratif). */
export function Stamp({ children, color, className = '' }: { children: ReactNode; color: string; className?: string }) {
  return (
    <span
      className={`inline-block rounded-field border-[3px] px-3 py-1 font-display text-lg font-black uppercase tracking-wider ${className}`}
      style={{ color, borderColor: color }}
    >
      {children}
    </span>
  );
}

/**
 * QR dummy untuk tampilan. Pola dibentuk dari nilai `value` agar stabil antar render.
 * Bukan kode QR yang bisa dipindai.
 */
export function DemoQr({ value, label, size = 96 }: { value: string; label: string; size?: number }) {
  const n = 25;
  const cells: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  let seed = 0;
  for (const ch of value) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells[y][x] = rnd() < 0.5;
  const finder = (ox: number, oy: number) => {
    for (let dy = 0; dy < 7; dy++)
      for (let dx = 0; dx < 7; dx++)
        cells[oy + dy][ox + dx] = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges" className="block bg-white">
      {cells.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0b1c30" /> : null)))}
    </svg>
  );
}

/** Barcode dummy untuk tampilan. Lebar batang dibentuk dari `value`. */
export function DemoBarcode({ value, label, width = 180, height = 40 }: { value: string; label: string; width?: number; height?: number }) {
  const rects: ReactNode[] = [];
  let x = 0;
  let bar = true;
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    for (let k = 0; k < 8; k++) {
      const w = (code >> k) & 1 ? 2 : 1;
      if (bar) rects.push(<rect key={`${rects.length}`} x={x} y={0} width={w} height={20} fill="#0b1c30" />);
      x += w;
      bar = !bar;
    }
  }
  return (
    <svg viewBox={`0 0 ${x} 20`} width={width} height={height} role="img" aria-label={label} preserveAspectRatio="none" shapeRendering="crispEdges" className="block bg-white">
      {rects}
    </svg>
  );
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

/** Ejaan angka dalam bahasa Indonesia (tanpa kata "rupiah"). */
function sebut(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${sebut(n - 10)} belas`;
  if (n < 100) return `${sebut(Math.floor(n / 10))} puluh${n % 10 ? ` ${sebut(n % 10)}` : ''}`;
  if (n < 200) return `seratus${n - 100 ? ` ${sebut(n - 100)}` : ''}`;
  if (n < 1000) return `${sebut(Math.floor(n / 100))} ratus${n % 100 ? ` ${sebut(n % 100)}` : ''}`;
  if (n < 2000) return `seribu${n - 1000 ? ` ${sebut(n - 1000)}` : ''}`;
  if (n < 1_000_000) return `${sebut(Math.floor(n / 1000))} ribu${n % 1000 ? ` ${sebut(n % 1000)}` : ''}`;
  if (n < 1_000_000_000) return `${sebut(Math.floor(n / 1_000_000))} juta${n % 1_000_000 ? ` ${sebut(n % 1_000_000)}` : ''}`;
  return `${sebut(Math.floor(n / 1_000_000_000))} miliar${n % 1_000_000_000 ? ` ${sebut(n % 1_000_000_000)}` : ''}`;
}

/** Terbilang rupiah dengan huruf kapital di setiap kata, misalnya "Tiga Juta Rupiah". */
export function terbilang(value: string | number): string {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return '-';
  const words = n === 0 ? 'nol' : sebut(Math.abs(n));
  const title = `${n < 0 ? 'minus ' : ''}${words} rupiah`.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return title;
}
