import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../../lib/money';
import type { OrderStatus, PaymentStatus } from '../../api/types';
import { CARD, HIDE_MD, MUTED_SMALL, SKU, StatusBadge, TABLE, TBODY, TD, TD_NUM, TH, TH_NUM, btn, cx, type Tone } from './adminUi';

const DAY = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });

function statusInfo(status: OrderStatus, payment: PaymentStatus): { label: string; tone: Tone } {
  if (payment === 'refunded') return { label: 'Dana dikembalikan', tone: 'danger' };
  if (status === 'paid') return { label: 'Perlu dikirim', tone: 'warn' };
  if (status === 'completed') return { label: 'Selesai', tone: 'ok' };
  if (status === 'cancelled') return { label: 'Dibatalkan', tone: 'danger' };
  if (status === 'pending_payment') return { label: 'Menunggu bayar', tone: 'neutral' };
  return { label: ORDER_STATUS_LABEL[status] ?? status, tone: 'info' };
}

const KPI_TOP = 'flex items-center justify-between gap-2 text-sm font-semibold text-ink-2';
const KPI_ICON = 'material-symbols-outlined flex h-9 w-9 flex-none items-center justify-center rounded-field bg-secondary-container text-[20px] text-on-secondary-container';
const KPI_VALUE = 'font-display text-xl font-bold leading-7 tabular-nums tracking-[-0.3px] text-ink sm:text-[26px] sm:leading-8';
const SECTION_TITLE = 'font-display text-lg font-semibold leading-7 text-ink sm:text-xl';
const LINK_SMALL = 'text-xs font-semibold text-primary hover:underline';

export default function AdminDashboard() {
  const dash = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.adminDashboard, refetchInterval: 60_000 });

  if (dash.isPending) return <p className="text-muted">Memuat ringkasan…</p>;
  if (dash.isError || !dash.data) return <p className="rounded-field bg-error-soft px-3.5 py-2.5 text-sm text-on-error-soft">Gagal memuat ringkasan.</p>;
  const d = dash.data;
  const max = Math.max(1, ...d.sales_7d.map((x) => Number(x.total)));
  const todayIso = d.sales_7d[d.sales_7d.length - 1]?.day;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[26px] font-bold leading-9 tracking-[-0.4px] sm:text-[28px]">Ringkasan penjualan</h1>
          <p className={MUTED_SMALL}>Pendapatan dari pesanan yang sudah dibayar · diperbarui otomatis</p>
        </div>
        <Link to="/admin/products" className={btn('primary')}>
          <span className="material-symbols-outlined" aria-hidden>add</span>
          Kelola produk
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <article className={cx(CARD, 'flex flex-col gap-1.5 p-4 lg:p-5')}>
          <div className={KPI_TOP}><span>Total pendapatan</span><span className={KPI_ICON} aria-hidden>payments</span></div>
          <strong className={cx(KPI_VALUE, 'break-words')}>{rp(d.revenue_total)}</strong>
          <span className={MUTED_SMALL}>{d.orders_total} pesanan lunas</span>
        </article>
        <article className={cx(CARD, 'flex flex-col gap-1.5 p-4 lg:p-5')}>
          <div className={KPI_TOP}><span>Perlu dikirim</span><span className={KPI_ICON} aria-hidden>local_shipping</span></div>
          <strong className={KPI_VALUE}>{d.orders_to_ship}</strong>
          <span className={MUTED_SMALL}>pesanan menunggu proses</span>
        </article>
        <article className={cx(CARD, 'flex flex-col gap-1.5 p-4 lg:p-5')}>
          <div className={KPI_TOP}><span>Produk aktif</span><span className={KPI_ICON} aria-hidden>inventory_2</span></div>
          <strong className={KPI_VALUE}>{d.active_products}</strong>
          <span className={MUTED_SMALL}>produk tampil di katalog</span>
        </article>
        <article className={cx(CARD, 'flex flex-col gap-1.5 p-4 lg:p-5')}>
          <div className={KPI_TOP}><span>Stok menipis</span><span className={cx(KPI_ICON, 'text-accent')} aria-hidden>warning</span></div>
          <strong className={KPI_VALUE}>{d.low_stock_count}</strong>
          <span className={d.low_stock_count > 0 ? 'text-xs font-semibold text-accent' : MUTED_SMALL}>
            {d.low_stock_count > 0 ? 'Perlu restok (≤ 5 unit)' : 'Semua stok aman'}
          </span>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <article className={cx(CARD, 'flex flex-col p-4 sm:p-5')}>
          <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
            <h2 className={SECTION_TITLE}>Penjualan 7 hari terakhir</h2>
            <span className={MUTED_SMALL}>Dalam ribu rupiah</span>
          </div>
          <div className="mt-3 flex h-56 items-end gap-1.5 sm:gap-3" role="img" aria-label="Grafik penjualan 7 hari">
            {d.sales_7d.map((x) => {
              const value = Number(x.total);
              const isToday = x.day === todayIso;
              const dayLabel = DAY.format(new Date(`${x.day}T00:00:00Z`));
              return (
                <div className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5" key={x.day}>
                  <span className="h-4 text-[11px] tabular-nums text-muted">{value > 0 ? Math.round(value / 1000).toLocaleString('id-ID') : ''}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cx('w-full rounded-t-lg', isToday ? 'bg-primary' : 'bg-secondary-container')}
                      style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                    />
                  </div>
                  <span className={cx('text-[11px] font-semibold', isToday ? 'font-bold text-primary' : 'text-muted')}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className={cx(CARD, 'p-4 sm:p-5')}>
          <div className="flex items-end justify-between gap-2">
            <h2 className={SECTION_TITLE}>Stok menipis</h2>
            <Link to="/admin/products" className={LINK_SMALL}>Lihat semua</Link>
          </div>
          {d.low_stock.length === 0 && <p className={cx(MUTED_SMALL, 'mt-3')}>Tidak ada produk dengan stok menipis.</p>}
          <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
            {d.low_stock.map((p) => (
              <li
                key={p.id}
                className={cx(
                  'flex items-center justify-between gap-3 rounded-field p-3.5',
                  p.stock <= 2 ? 'bg-warning-soft/70' : 'bg-surface-low',
                )}
              >
                <div className="min-w-0 text-left">
                  <strong className="block font-display text-[15px] font-semibold text-ink">{p.name}</strong>
                  <span className={cx(SKU, 'mt-0.5 block truncate')}>{p.sku}</span>
                </div>
                <StatusBadge tone={p.stock <= 2 ? 'danger' : 'warn'}>Sisa {p.stock}</StatusBadge>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={cx(CARD, 'overflow-hidden')}>
        <div className="flex items-end justify-between gap-2 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <h2 className={SECTION_TITLE}>Pesanan terbaru</h2>
          <Link to="/admin/orders" className={LINK_SMALL}>Kelola pesanan</Link>
        </div>
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>Invoice</th>
                <th className={TH}>Pembeli</th>
                <th className={cx(TH, HIDE_MD)}>Waktu</th>
                <th className={TH}>Status</th>
                <th className={TH_NUM}>Total</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {d.recent_orders.map((o) => {
                const s = statusInfo(o.status, o.payment_status);
                return (
                  <tr key={o.id}>
                    <td className={cx(TD, SKU)}>{o.invoice_no}</td>
                    <td className={TD}>{o.buyer_name ?? '-'}</td>
                    <td className={cx(TD, HIDE_MD, MUTED_SMALL)}>{formatDate(o.created_at)}</td>
                    <td className={TD}><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                    <td className={TD_NUM}>{rp(o.grand_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
