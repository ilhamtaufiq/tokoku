import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../../lib/money';
import type { OrderStatus, PaymentStatus } from '../../api/types';
import { PageHeader } from '../../components/PageHeader';
import { DEMO_KPI_TREND, DEMO_MONTHLY_SALES, DEMO_URGENT_TASKS } from '../../data/demo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiCard } from '../../components/admin/KpiCard';
import { TONE_BADGE } from '../../components/admin/status';
import { DEMO_TAG, HIDE_MD, MONEY, MUTED_SMALL, SKU, Sparkline, TABLE_STACK, Trend, cx, type Tone } from './adminUi';

const DAY = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });

function statusInfo(status: OrderStatus, payment: PaymentStatus): { label: string; tone: Tone } {
  if (payment === 'refunded') return { label: 'Dana dikembalikan', tone: 'danger' };
  if (status === 'paid') return { label: 'Perlu dikirim', tone: 'warn' };
  if (status === 'completed') return { label: 'Selesai', tone: 'ok' };
  if (status === 'cancelled') return { label: 'Dibatalkan', tone: 'danger' };
  if (status === 'pending_payment') return { label: 'Menunggu bayar', tone: 'neutral' };
  return { label: ORDER_STATUS_LABEL[status] ?? status, tone: 'info' };
}

/** Angka KPI memakai font mono agar lebar digit sama dan sejajar antar kartu. */
const KPI_VALUE = cx(MONEY, 'text-xl font-bold leading-7 text-ink sm:text-[26px] sm:leading-8');
const SECTION_TITLE = 'font-display text-lg font-semibold leading-7 text-ink sm:text-xl';
const PANEL = 'gap-0 rounded-card border border-outline-soft bg-surface py-0 shadow-card ring-0';
const TASK_TONE: Record<'danger' | 'warn' | 'info', string> = {
  danger: 'bg-error-soft text-on-error-soft',
  warn: 'bg-warning-soft text-on-warning-soft',
  info: 'bg-secondary-container text-on-secondary-container',
};

type Series = '7d' | '6m';

export default function AdminDashboard() {
  const dash = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.adminDashboard, refetchInterval: 60_000 });
  const [series, setSeries] = useState<Series>('7d');

  if (dash.isPending) return <p className="text-muted">Memuat ringkasan…</p>;
  if (dash.isError || !dash.data) return <p className="rounded-field bg-error-soft px-3.5 py-2.5 text-sm text-on-error-soft">Gagal memuat ringkasan.</p>;
  const d = dash.data;
  const max = Math.max(1, ...d.sales_7d.map((x) => Number(x.total)));
  const todayIso = d.sales_7d[d.sales_7d.length - 1]?.day;
  const monthMax = Math.max(1, ...DEMO_MONTHLY_SALES.map((m) => m.value));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={['Portal penjual', 'Operasional bisnis', 'Ringkasan']}
        title="Ringkasan penjualan"
        subtitle="Pendapatan dari pesanan yang sudah dibayar · diperbarui otomatis"
        actions={
          <>
            {/* DEMO: tombol unduh rekap belum punya API, jadi dinonaktifkan. */}
            <Button variant="outline" className="h-11 md:h-9" disabled title="Belum tersedia">
              <span className="material-symbols-outlined" aria-hidden>download</span>
              Unduh rekap
              <span className={DEMO_TAG}>Demo</span>
            </Button>
            <Button render={<Link to="/admin/products" />} nativeButton={false} className="h-11 md:h-9">
              <span className="material-symbols-outlined" aria-hidden>add</span>
              Kelola produk
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Ringkasan angka">
        <KpiCard title="Total pendapatan" icon="payments">
          <strong className={cx(KPI_VALUE, 'whitespace-nowrap text-base sm:text-xl lg:text-[22px]')}>{rp(d.revenue_total)}</strong>
          <span className={MUTED_SMALL}>{d.orders_total} pesanan lunas</span>
          {/* DEMO: tren persentase dan sparkline bulanan dummy. */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Trend {...DEMO_KPI_TREND.revenue} />
            <span className={DEMO_TAG}>Demo</span>
          </div>
          <div className="text-primary">
            {/* DEMO */}
            <Sparkline values={DEMO_MONTHLY_SALES.map((m) => m.value)} />
          </div>
        </KpiCard>
        <KpiCard title="Perlu dikirim" icon="local_shipping">
          <strong className={KPI_VALUE}>{d.orders_to_ship}</strong>
          <span className={MUTED_SMALL}>pesanan menunggu proses</span>
          {/* DEMO: tren pesanan baru dummy. */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Trend {...DEMO_KPI_TREND.toShip} />
            <span className={DEMO_TAG}>Demo</span>
          </div>
        </KpiCard>
        <KpiCard title="Produk aktif" icon="inventory_2">
          <strong className={KPI_VALUE}>{d.active_products}</strong>
          <span className={MUTED_SMALL}>produk tampil di katalog</span>
          {/* DEMO: tren produk baru dummy. */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Trend {...DEMO_KPI_TREND.products} />
            <span className={DEMO_TAG}>Demo</span>
          </div>
        </KpiCard>
        <KpiCard title="Stok menipis" icon="warning" iconClassName="text-accent">
          <strong className={KPI_VALUE}>{d.low_stock_count}</strong>
          <span className={d.low_stock_count > 0 ? 'text-xs font-semibold text-accent' : MUTED_SMALL}>
            {d.low_stock_count > 0 ? 'Perlu restok (≤ 5 unit)' : 'Semua stok aman'}
          </span>
          {/* DEMO: tren stok menipis dummy. */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Trend {...DEMO_KPI_TREND.lowStock} />
            <span className={DEMO_TAG}>Demo</span>
          </div>
        </KpiCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className={cx(PANEL, 'min-w-0 p-4 sm:p-5')}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className={SECTION_TITLE}>Tren penjualan</h2>
              <span className={MUTED_SMALL}>{series === '7d' ? 'Dalam ribu rupiah · 7 hari terakhir' : 'Dalam juta rupiah · 6 bulan'}</span>
            </div>
            {/* DEMO: pilihan 6 bulan memakai data bulanan dummy. */}
            <div className="inline-flex gap-1 rounded-pill bg-surface-low p-1" role="group" aria-label="Rentang grafik">
              <Button
                variant={series === '7d' ? 'default' : 'ghost'}
                className="h-11 rounded-pill px-3.5 text-xs md:h-8"
                aria-pressed={series === '7d'}
                onClick={() => setSeries('7d')}
              >
                7 hari
              </Button>
              <Button
                variant={series === '6m' ? 'default' : 'ghost'}
                className="h-11 rounded-pill px-3.5 text-xs md:h-8"
                aria-pressed={series === '6m'}
                onClick={() => setSeries('6m')}
              >
                6 bulan
                <span className={cx(DEMO_TAG, 'ml-1.5')}>Demo</span>
              </Button>
            </div>
          </div>

          {series === '7d' ? (
            <div className="mt-4 flex h-56 items-end gap-1.5 sm:gap-3" role="img" aria-label="Grafik penjualan 7 hari">
              {d.sales_7d.map((x) => {
                const value = Number(x.total);
                const isToday = x.day === todayIso;
                const dayLabel = DAY.format(new Date(`${x.day}T00:00:00Z`));
                return (
                  <div className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5" key={x.day}>
                    <span className={cx('h-4 text-[11px] text-muted', MONEY)}>{value > 0 ? Math.round(value / 1000).toLocaleString('id-ID') : ''}</span>
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
          ) : (
            <div className="mt-4 flex h-56 items-end gap-2 sm:gap-4" role="img" aria-label="Grafik penjualan 6 bulan (contoh)">
              {/* DEMO */}
              {DEMO_MONTHLY_SALES.map((m, i) => {
                const isLast = i === DEMO_MONTHLY_SALES.length - 1;
                return (
                  <div className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5" key={m.label}>
                    <span className={cx('h-4 text-[11px] text-muted', MONEY)}>{Math.round(m.value / 1_000_000)}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={cx('w-full rounded-t-lg', isLast ? 'bg-primary' : 'bg-secondary-container')}
                        style={{ height: `${Math.max(4, (m.value / monthMax) * 100)}%` }}
                      />
                    </div>
                    <span className={cx('text-[11px] font-semibold', isLast ? 'font-bold text-primary' : 'text-muted')}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {/* DEMO: daftar tugas mendesak dummy. */}
          <Card className={cx(PANEL, 'p-4 sm:p-5')}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={SECTION_TITLE}>Tugas mendesak</h2>
              <Badge variant="outline" className={cx(DEMO_TAG, 'h-5 rounded-pill')}>Demo</Badge>
            </div>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
              {DEMO_URGENT_TASKS.map((t) => (
                <li key={t.title} className="flex items-start gap-3 rounded-field bg-surface-low p-3.5">
                  <span className={cx('material-symbols-outlined flex h-9 w-9 flex-none items-center justify-center rounded-field text-[20px]', TASK_TONE[t.tone])} aria-hidden>
                    {t.tone === 'danger' ? 'priority_high' : t.tone === 'warn' ? 'schedule' : 'verified_user'}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <strong className="block text-left font-display text-[15px] font-semibold text-ink">{t.title}</strong>
                    <span className="mt-0.5 block text-left text-xs text-muted">{t.detail}</span>
                    <span className={cx('mt-1.5 inline-block text-xs font-semibold', t.tone === 'danger' ? 'text-error' : 'text-muted')}>{t.due}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className={cx(PANEL, 'p-4 sm:p-5')}>
            <div className="flex items-end justify-between gap-2">
              <h2 className={SECTION_TITLE}>Stok menipis</h2>
              <Link to="/admin/products" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline md:min-h-0">Lihat semua</Link>
            </div>
            {d.low_stock.length === 0 && <p className={cx(MUTED_SMALL, 'mt-3')}>Tidak ada produk dengan stok menipis.</p>}
            <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
              {d.low_stock.map((p) => (
                <li
                  key={p.id}
                  className={cx('flex items-center justify-between gap-3 rounded-field p-3.5', p.stock <= 2 ? 'bg-warning-soft/70' : 'bg-surface-low')}
                >
                  <div className="min-w-0 text-left">
                    <strong className="block text-left font-display text-[15px] font-semibold text-ink">{p.name}</strong>
                    <span className={cx(SKU, 'mt-0.5 block truncate text-left')}>{p.sku}</span>
                  </div>
                  <Badge variant="outline" className={cx('h-6 rounded-pill px-2.5 text-xs font-semibold', TONE_BADGE[p.stock <= 2 ? 'danger' : 'warn'])}>
                    Sisa {p.stock}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <Card className={cx(PANEL, 'overflow-hidden')}>
        <div className="flex items-end justify-between gap-2 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <h2 className={SECTION_TITLE}>Pesanan terbaru</h2>
          <Link to="/admin/orders" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline md:min-h-0">Kelola pesanan</Link>
        </div>
        <Table className={cx(TABLE_STACK, 'mt-2')}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3 sm:px-4">Invoice</TableHead>
              <TableHead className="px-3 sm:px-4">Pembeli</TableHead>
              <TableHead className={cx('px-3 sm:px-4', HIDE_MD)}>Waktu</TableHead>
              <TableHead className="px-3 sm:px-4">Status</TableHead>
              <TableHead className="px-3 text-right sm:px-4">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.recent_orders.map((o) => {
              const s = statusInfo(o.status, o.payment_status);
              return (
                <TableRow key={o.id} className="border-outline-soft">
                  <TableCell data-label="" className={cx('px-3 py-3 sm:px-4', SKU, 'max-md:block!')}>{o.invoice_no}</TableCell>
                  <TableCell data-label="Pembeli" className="px-3 py-3 sm:px-4">{o.buyer_name ?? '-'}</TableCell>
                  <TableCell data-label="Waktu" className={cx('px-3 py-3 sm:px-4', MUTED_SMALL, HIDE_MD)}>{formatDate(o.created_at)}</TableCell>
                  <TableCell data-label="Status" className="px-3 py-3 sm:px-4">
                    <Badge variant="outline" className={cx('h-6 whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold', TONE_BADGE[s.tone])}>{s.label}</Badge>
                  </TableCell>
                  <TableCell data-label="Total" className={cx('whitespace-nowrap px-3 py-3 text-right sm:px-4', MONEY)}>{rp(o.grand_total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
