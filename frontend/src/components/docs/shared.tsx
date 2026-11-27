import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { OrderDetail } from '../../api/types';
import { formatDate } from '../../lib/money';

/** Kertas dokumen: selalu putih dan berwarna gelap, termasuk mode gelap, agar aman dicetak. */
export function Paper({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <article
      className="mx-auto max-w-[820px] rounded-card bg-white p-6 text-[#1a1b22] shadow-card sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
      style={{ borderTop: `6px solid ${accent}` }}
    >
      {children}
    </article>
  );
}

/** Bilah aksi di atas dokumen. Tidak ikut tercetak. */
export function DocToolbar({ orderId, active }: { orderId: number; active: 'invoice' | 'sp' | 'sj' | 'bast' }) {
  const tabs: { key: typeof active; to: string; label: string }[] = [
    { key: 'invoice', to: `/orders/${orderId}/invoice`, label: 'Invoice' },
    { key: 'sp', to: `/orders/${orderId}/surat-pesanan`, label: 'Surat pesanan' },
    { key: 'sj', to: `/orders/${orderId}/surat-jalan`, label: 'Surat jalan' },
    { key: 'bast', to: `/orders/${orderId}/bast`, label: 'BAST' },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link to={`/orders/${orderId}`} className="text-sm font-semibold text-primary no-underline hover:underline">← Kembali ke pesanan</Link>
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

/** Identitas toko penerbit dokumen (diambil dari pesanan, karena setiap pesanan milik satu toko). */
export function StoreBlock({ order }: { order: OrderDetail }) {
  return (
    <div className="text-sm">
      <strong className="font-display text-base">{order.store_name || 'Nama toko belum diatur'}</strong>
      {order.store_npwp && <p className="m-0">NPWP: {formatNpwp(order.store_npwp)}</p>}
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

/** Kolom tanda tangan dengan garis dan nama. */
export function SignatureBox({ title, name, dateLabel }: { title: string; name: string; dateLabel?: string }) {
  return (
    <div className="flex flex-col gap-1 text-center text-sm">
      <p className="m-0 font-semibold">{title}</p>
      <div className="mt-16 border-t border-[#1a1b22] pt-1">
        <p className="m-0 font-semibold">{name}</p>
      </div>
      {dateLabel && <p className="m-0 text-xs text-[#5b5e6e]">{dateLabel}</p>}
    </div>
  );
}
