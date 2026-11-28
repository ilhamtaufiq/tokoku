import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { OrderStatus, OrderView } from '../api/types';
import { ProductImage } from '../components/ProductImage';
import {
  DEMO_BUYER_TAG,
  DEMO_ORDER_PREVIEW,
  DEMO_SELLER_LINK,
  DEMO_STORE_CITY,
  DEMO_VA,
} from '../data/demo';
import { ORDER_STATUS_LABEL, formatDate, percent, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

const btnPrimary =
  'inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-primary bg-primary px-5 text-sm font-semibold text-on-primary no-underline transition-[filter,opacity] hover:brightness-110 active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const btnDefault =
  'inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-outline bg-surface px-4 text-sm font-semibold text-ink no-underline transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-45';
const linkAction =
  'inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Warna kapsul status pesanan (token tema, ikut mode gelap). */
const statusTone: Record<string, string> = {
  pending_payment: 'bg-warning-soft text-on-warning-soft',
  paid: 'bg-primary-container text-on-primary',
  processing: 'bg-primary-container text-on-primary',
  shipped: 'bg-accent-soft text-on-accent-soft',
  completed: 'bg-success-soft text-on-success-soft',
  cancelled: 'bg-error-soft text-on-error-soft',
};

type TabKey = 'semua' | 'belum' | 'diproses' | 'dikirim' | 'selesai' | 'dibatalkan';

/** Tab filter. Hitungan dihitung dari daftar pesanan nyata. */
const TABS: { key: TabKey; label: string; statuses: OrderStatus[] | null }[] = [
  { key: 'semua', label: 'Semua', statuses: null },
  { key: 'belum', label: 'Belum Bayar', statuses: ['pending_payment'] },
  { key: 'diproses', label: 'Diproses', statuses: ['paid', 'processing'] },
  { key: 'dikirim', label: 'Dikirim', statuses: ['shipped'] },
  { key: 'selesai', label: 'Selesai', statuses: ['completed'] },
  { key: 'dibatalkan', label: 'Dibatalkan', statuses: ['cancelled'] },
];

const isWaiting = (o: OrderView) => o.status === 'pending_payment' && o.payment_status === 'unpaid';

export default function Orders() {
  useSeo({ title: 'Pesanan saya', noindex: true });
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders });
  const [tab, setTab] = useState<TabKey>('semua');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const list = orders.data ?? [];
  const hasWaiting = list.some(isWaiting);
  // Hitung mundur pembayaran, hanya jika ada pesanan yang menunggu pembayaran.
  useEffect(() => {
    if (!hasWaiting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasWaiting]);

  if (orders.isPending) {
    return (
      <section className="mx-auto max-w-[1040px]">
        <h1 className="mb-6 font-display text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink md:text-[32px]">Pesanan saya</h1>
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Memuat pesanan…</span>
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex flex-col gap-4 rounded-card border border-outline-soft bg-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-40 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
                  <div className="h-3 w-28 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
                </div>
                <div className="h-6 w-24 animate-pulse rounded-pill bg-surface-high motion-reduce:animate-none" />
              </div>
              <div className="h-5 w-32 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (orders.isError) {
    return (
      <p className="my-3 rounded-field bg-error-soft px-4 py-3 text-sm text-on-error-soft">
        Gagal memuat pesanan.
      </p>
    );
  }

  if (list.length === 0) {
    return (
      <section className="mx-auto flex max-w-[480px] flex-col items-center rounded-card border border-outline-soft bg-surface px-5 py-14 text-center sm:py-16">
        <span className="material-symbols-outlined mb-4 grid size-16 place-items-center rounded-pill bg-surface-high text-[32px] text-muted" aria-hidden>receipt_long</span>
        <h1 className="mb-2 font-display text-2xl font-bold text-ink sm:text-[28px]">Belum ada pesanan</h1>
        <p className="mb-6 max-w-sm text-sm text-muted">Pesanan yang kamu buat akan muncul di sini.</p>
        <Link to="/" className={btnPrimary}>Mulai belanja</Link>
      </section>
    );
  }

  const q = query.trim().toLowerCase();
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const visible = list.filter((o) => {
    if (activeTab.statuses && !activeTab.statuses.includes(o.status)) return false;
    if (!q) return true;
    return o.invoice_no.toLowerCase().includes(q) || (o.store_name ?? '').toLowerCase().includes(q);
  });
  const countOf = (t: (typeof TABS)[number]) =>
    t.statuses ? list.filter((o) => t.statuses!.includes(o.status)).length : list.length;
  const reset = () => {
    setTab('semua');
    setQuery('');
  };

  return (
    <section className="mx-auto max-w-[1040px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {/* DEMO */}
          <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-accent">Portal pengadaan & fiskal</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink md:text-[32px]">Pesanan saya</h1>
            <span className="inline-flex h-6 items-center rounded-pill bg-surface-high px-2.5 text-xs font-semibold text-ink-2">
              {list.length} pesanan
            </span>
          </div>
        </div>
        {/* DEMO */}
        <span className="inline-flex h-8 items-center gap-2 rounded-pill border border-outline-soft bg-surface px-3 text-xs font-medium text-ink-2">
          <span className="size-2 rounded-pill bg-success" aria-hidden />
          Sinkronisasi e-Faktur DJP aktif
        </span>
      </header>

      <div className="rounded-card border border-outline-soft bg-surface p-2 shadow-card">
        <div role="tablist" aria-label="Filter status pesanan" className="flex gap-1.5 overflow-x-auto">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-pill px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  on ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-surface-low hover:text-primary'
                }`}
              >
                {t.label}
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-xs font-bold tabular-nums ${
                    on ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-high text-ink-2'
                  }`}
                >
                  {countOf(t)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 !text-[20px] text-muted" aria-hidden>search</span>
          <input
            type="search"
            aria-label="Cari pesanan"
            placeholder="Cari nomor invoice atau nama toko…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 w-full rounded-pill border border-outline bg-surface pr-4 pl-10 text-sm text-ink placeholder:text-muted outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
          />
        </div>
        {/* DEMO: filter periode dan tipe belum berfungsi */}
        <select disabled aria-label="Periode transaksi (segera hadir)" className="h-11 rounded-pill border border-outline bg-surface px-4 text-sm text-ink-2 disabled:opacity-70">
          <option>30 hari terakhir</option>
        </select>
        <select disabled aria-label="Tipe transaksi (segera hadir)" className="h-11 rounded-pill border border-outline bg-surface px-4 text-sm text-ink-2 disabled:opacity-70">
          <option>Semua tipe transaksi</option>
        </select>
        <button type="button" onClick={reset} className={btnDefault}>
          <span className="material-symbols-outlined !text-[18px]" aria-hidden>tune</span>
          Reset
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-card border border-outline-soft bg-surface px-5 py-10 text-center text-sm text-muted">
          Tidak ada pesanan yang cocok dengan filter ini.
        </p>
      ) : (
        <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
          {visible.map((o) => (
            <li key={o.id}>
              <OrderCard o={o} remaining={isWaiting(o) ? Math.max(0, o.expires_in_seconds - Math.floor((now - orders.dataUpdatedAt) / 1000)) : null} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p className="m-0">Menampilkan {visible.length} dari {list.length} pesanan</p>
        {/* DEMO: paginasi belum tersedia, daftar memuat semua pesanan */}
        <nav aria-label="Halaman (contoh)" className="flex items-center gap-1.5">
          <button type="button" disabled aria-label="Halaman sebelumnya" className="grid size-11 place-items-center rounded-pill border border-outline-soft bg-surface disabled:opacity-45">
            <span className="material-symbols-outlined !text-[18px]" aria-hidden>chevron_left</span>
          </button>
          <span aria-current="page" className="grid size-11 place-items-center rounded-pill bg-primary font-semibold text-on-primary">1</span>
          <button type="button" disabled aria-label="Halaman berikutnya" className="grid size-11 place-items-center rounded-pill border border-outline-soft bg-surface disabled:opacity-45">
            <span className="material-symbols-outlined !text-[18px]" aria-hidden>chevron_right</span>
          </button>
        </nav>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-outline-soft bg-surface-low p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="material-symbols-outlined grid size-11 shrink-0 place-items-center rounded-pill bg-primary-container text-[22px] text-on-primary" aria-hidden>verified_user</span>
          <div className="min-w-0">
            <p className="m-0 font-display text-base font-semibold text-ink">Jaminan Pengadaan Resmi</p>
            <p className="m-0 mt-1 text-sm text-ink-2">Semua transaksi dicatat pada sistem e-Faktur Ditjen Pajak &amp; terlindungi garansi 100% barang orisinal.</p>
          </div>
        </div>
        {/* DEMO: unduhan rekap belum tersedia */}
        <button type="button" disabled className={`${btnDefault} disabled:opacity-60`}>
          <span className="material-symbols-outlined !text-[18px]" aria-hidden>download</span>
          Unduh rekap laporan BOS
        </button>
      </div>
    </section>
  );
}

function OrderCard({ o, remaining }: { o: OrderView; remaining: number | null }) {
  const waiting = remaining !== null;
  const detailPath = `/orders/${o.id}`;
  return (
    <article className="overflow-hidden rounded-card border border-outline-soft bg-surface shadow-card transition-[border-color,box-shadow] hover:border-primary hover:shadow-pop">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-soft px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="material-symbols-outlined grid size-10 shrink-0 place-items-center rounded-pill bg-primary-container text-[20px] text-on-primary" aria-hidden>storefront</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {o.store_name && <strong className="font-display text-[15px] font-semibold text-ink">{o.store_name}</strong>}
              {o.store_npwp && (
                <span className="inline-flex h-5 items-center rounded-pill bg-success-soft px-2 text-[11px] font-bold uppercase tracking-wide text-on-success-soft">PKP resmi</span>
              )}
              {/* DEMO */}
              <span className="inline-flex h-5 items-center rounded-pill bg-surface-high px-2 text-[11px] font-semibold text-ink-2">{DEMO_STORE_CITY}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex h-6 items-center rounded-field bg-surface-high px-2 font-mono font-semibold tabular-nums text-ink-2">{o.invoice_no}</span>
              <span>{formatDate(o.created_at)}</span>
              {/* DEMO */}
              <span className="inline-flex h-5 items-center rounded-pill border border-outline-soft px-2 text-[11px] font-semibold text-ink-2">{DEMO_BUYER_TAG}</span>
            </div>
          </div>
        </div>
        <span
          className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-pill px-3 text-xs font-semibold ${
            statusTone[o.status] ?? 'bg-surface-high text-ink-2'
          }`}
        >
          {ORDER_STATUS_LABEL[o.status] ?? o.status}
        </span>
      </div>

      {o.tracking_number && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-soft bg-surface-low px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="material-symbols-outlined !text-[20px] text-primary" aria-hidden>local_shipping</span>
            <div className="min-w-0 text-sm">
              <p className="m-0 font-semibold text-ink">{o.courier ?? 'Ekspedisi'}{o.courier_service ? ` ${o.courier_service}` : ''}</p>
              <p className="m-0 text-xs text-muted">Resi: <span className="font-mono tabular-nums text-ink-2">{o.tracking_number}</span></p>
            </div>
          </div>
          {o.estimated_days && (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-success-soft px-3 text-xs font-semibold text-on-success-soft">
              <span className="material-symbols-outlined !text-[16px]" aria-hidden>schedule</span>
              Estimasi {o.estimated_days} hari
            </span>
          )}
        </div>
      )}

      {waiting && (
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-soft bg-warning-soft px-4 py-2.5 text-sm text-on-warning-soft sm:px-5">
          <span className="material-symbols-outlined !text-[18px]" aria-hidden>schedule</span>
          <span>Sisa waktu pembayaran</span>
          <span className="font-mono font-semibold tabular-nums">{formatRemaining(remaining)}</span>
          <span className="text-xs opacity-80">Jika tidak dibayar, pesanan dibatalkan otomatis.</span>
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex min-w-0 flex-1 gap-4">
          {/* DEMO: daftar pesanan belum memuat gambar item, placeholder dipakai */}
          <ProductImage name={DEMO_ORDER_PREVIEW.name} src={null} className="size-20 shrink-0 rounded-field border border-outline-soft sm:size-24" />
          <div className="min-w-0 flex-1">
            <p className="m-0 font-display text-[15px] font-semibold leading-6 text-ink">{DEMO_ORDER_PREVIEW.name}</p>
            <p className="m-0 mt-1 text-xs text-muted">{DEMO_ORDER_PREVIEW.variant} · {DEMO_ORDER_PREVIEW.qty}</p>
            <p className="m-0 mt-2 font-mono text-sm font-semibold tabular-nums text-ink">{rp(o.subtotal)}</p>
          </div>
        </div>

        <dl className="m-0 flex w-full shrink-0 flex-col gap-2 rounded-field border border-dashed border-outline bg-surface-low p-3.5 sm:w-[250px]">
          <div className="flex justify-between gap-3 text-xs text-muted">
            <dt>Subtotal barang</dt>
            <dd className="m-0 font-mono tabular-nums text-ink-2">{rp(o.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-xs text-muted">
            <dt>Ongkos kirim</dt>
            <dd className="m-0 font-mono tabular-nums text-ink-2">{rp(o.shipping_fee)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-xs text-muted">
            <dt>PPN {percent(o.ppn_rate)}</dt>
            <dd className="m-0 font-mono tabular-nums text-ink-2">{rp(o.ppn_total)}</dd>
          </div>
          <div className="mt-1 flex items-end justify-between gap-3 border-t border-dashed border-outline pt-2.5">
            <dt className="text-sm font-semibold text-ink">{waiting ? 'Total tagihan' : 'Total transaksi'}</dt>
            <dd className="m-0 text-right">
              <span className="block font-mono text-lg font-bold tabular-nums text-ink">{rp(o.grand_total)}</span>
              {/* DEMO: nomor VA contoh */}
              {waiting && <span className="block font-mono text-[11px] text-muted">VA {DEMO_VA.bank} · {DEMO_VA.number}</span>}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-soft px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* DEMO: tautan dummy, belum ada fitur chat penjual */}
          <a href="#" onClick={(e) => e.preventDefault()} className={linkAction}>
            <span className="material-symbols-outlined !text-[18px]" aria-hidden>chat_bubble</span>
            {DEMO_SELLER_LINK}
          </a>
          {o.status === 'completed' && (
            <Link to={`${detailPath}/bast`} className={linkAction}>
              <span className="material-symbols-outlined !text-[18px]" aria-hidden>download</span>
              Unduh BAST
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {waiting && (
            o.payment_url ? (
              <a href={o.payment_url} className={btnPrimary}>Bayar sekarang</a>
            ) : (
              <Link to={detailPath} className={btnPrimary}>Bayar sekarang</Link>
            )
          )}
          {o.status === 'shipped' && (
            <Link to={detailPath} className={btnDefault}>
              <span className="material-symbols-outlined !text-[18px]" aria-hidden>route</span>
              Lacak
            </Link>
          )}
          <Link to={detailPath} className={btnPrimary}>
            Lihat detail
            <span className="material-symbols-outlined !text-[18px]" aria-hidden>arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function formatRemaining(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit ${String(s).padStart(2, '0')} detik`;
}
