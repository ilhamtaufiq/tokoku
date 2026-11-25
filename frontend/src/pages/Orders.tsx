import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

const btnPrimary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-field border border-primary bg-primary px-5 text-sm font-semibold text-on-primary no-underline transition-[filter,opacity] hover:brightness-110 active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default function Orders() {
  useSeo({ title: 'Pesanan saya', noindex: true });
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders });

  if (orders.isPending) {
    return (
      <section>
        <h1 className="mb-6 text-2xl font-bold sm:text-[32px]">Pesanan saya</h1>
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Memuat pesanan…</span>
          {[0, 1, 2].map((n) => (
            <div key={n} className="flex items-center gap-4 rounded-card border border-outline-soft bg-surface p-5">
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-40 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
                <div className="h-3 w-28 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
              </div>
              <div className="hidden h-6 w-24 animate-pulse rounded-pill bg-surface-high sm:block motion-reduce:animate-none" />
              <div className="h-5 w-24 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
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
      <section className="flex flex-col items-center px-4 py-16 text-center sm:py-20">
        <span className="material-symbols-outlined mb-4 text-5xl text-muted" aria-hidden>receipt_long</span>
        <h1 className="mb-2 text-2xl font-bold sm:text-[32px]">Belum ada pesanan</h1>
        <p className="mb-6 max-w-sm text-sm text-muted">Pesanan yang kamu buat akan muncul di sini.</p>
        <Link to="/" className={btnPrimary}>Mulai belanja</Link>
      </section>
    );
  }

  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold sm:text-[32px]">Pesanan saya</h1>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {orders.data.map((o) => {
          const cancelled = o.status === 'cancelled';
          return (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-outline-soft bg-surface p-4 text-ink no-underline transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5 sm:py-[18px]"
              >
                <div className="min-w-0 flex-1">
                  <strong className="font-display text-base font-semibold tabular-nums text-ink">{o.invoice_no}</strong>
                  <p className="mt-1 text-xs leading-[18px] text-muted">{formatDate(o.created_at)}</p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
                  <span
                    className={`inline-flex h-[26px] items-center rounded-pill px-2.5 text-xs font-semibold ${
                      cancelled ? 'bg-error-soft text-on-error-soft' : 'bg-surface-high text-ink-2'
                    }`}
                  >
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <strong className="font-display text-base font-semibold tabular-nums text-ink">{rp(o.grand_total)}</strong>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
