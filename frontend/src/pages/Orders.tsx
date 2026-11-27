import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

const btnPrimary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-primary bg-primary px-5 text-sm font-semibold text-on-primary no-underline transition-[filter,opacity] hover:brightness-110 active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Warna kapsul status pesanan (token tema, ikut mode gelap). */
const statusTone: Record<string, string> = {
  pending_payment: 'bg-warning-soft text-on-warning-soft',
  paid: 'bg-primary-container text-on-primary',
  processing: 'bg-primary-container text-on-primary',
  shipped: 'bg-accent-soft text-on-accent-soft',
  completed: 'bg-success-soft text-on-success-soft',
  cancelled: 'bg-error-soft text-on-error-soft',
};

export default function Orders() {
  useSeo({ title: 'Pesanan saya', noindex: true });
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders });

  if (orders.isPending) {
    return (
      <section className="mx-auto max-w-[880px]">
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

  if (orders.data.length === 0) {
    return (
      <section className="mx-auto flex max-w-[480px] flex-col items-center rounded-card border border-outline-soft bg-surface px-5 py-14 text-center sm:py-16">
        <span className="material-symbols-outlined mb-4 grid size-16 place-items-center rounded-pill bg-surface-high text-[32px] text-muted" aria-hidden>receipt_long</span>
        <h1 className="mb-2 font-display text-2xl font-bold text-ink sm:text-[28px]">Belum ada pesanan</h1>
        <p className="mb-6 max-w-sm text-sm text-muted">Pesanan yang kamu buat akan muncul di sini.</p>
        <Link to="/" className={btnPrimary}>Mulai belanja</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[880px]">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[28px] font-bold leading-9 tracking-[-0.4px] text-ink md:text-[32px]">Pesanan saya</h1>
        <span className="inline-flex h-6 items-center rounded-pill bg-surface-high px-2.5 text-xs font-semibold text-ink-2">
          {orders.data.length} pesanan
        </span>
      </header>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {orders.data.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="group flex flex-col gap-4 rounded-card border border-outline-soft bg-surface p-4 text-ink no-underline shadow-card transition-[border-color,box-shadow] hover:border-primary hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block font-mono text-sm font-semibold tabular-nums text-ink">{o.invoice_no}</strong>
                  <p className="mt-1 text-xs leading-[18px] text-muted">{formatDate(o.created_at)}</p>
                  {o.store_name && <p className="mt-0.5 text-xs font-medium text-ink-2">{o.store_name}</p>}
                </div>
                <span
                  className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold ${
                    statusTone[o.status] ?? 'bg-surface-high text-ink-2'
                  }`}
                >
                  {ORDER_STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 border-t border-outline-soft pt-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined !text-[18px]" aria-hidden>chevron_right</span>
                  <span className="group-hover:underline">Lihat detail</span>
                </div>
                <strong className="font-mono text-lg font-bold tabular-nums text-ink">{rp(o.grand_total)}</strong>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
