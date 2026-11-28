import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../../lib/money';
import type { AdminDashboard as AdminDashboardData, OrderStatus, PaymentStatus } from '../../api/types';
import { DEMO_MONTHLY_SALES } from '../../data/demo';
import { KpiCard } from '../../components/admin/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TONE_BADGE, TOUCH_BTN } from '../../components/admin/status';
import { DEMO_TAG, HIDE_MD, MUTED_SMALL, SKU, TABLE_STACK, cx, type Tone } from './adminUi';

const DAY = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
const DATE_LONG = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

function statusInfo(status: OrderStatus, payment: PaymentStatus): { label: string; tone: Tone } {
  if (payment === 'refunded') return { label: 'Dana dikembalikan', tone: 'danger' };
  if (status === 'paid') return { label: 'Perlu dikirim', tone: 'warn' };
  if (status === 'completed') return { label: 'Selesai', tone: 'ok' };
  if (status === 'cancelled') return { label: 'Dibatalkan', tone: 'danger' };
  if (status === 'pending_payment') return { label: 'Menunggu bayar', tone: 'neutral' };
  return { label: ORDER_STATUS_LABEL[status] ?? status, tone: 'info' };
}

type Series = '7d' | '6m';
type Point = { label: string; value: number };

const PERIOD_ITEMS: { value: Series; label: string }[] = [
  { value: '7d', label: '7 hari terakhir' },
  { value: '6m', label: '6 bulan' },
];
/** Tampilan donat hanya satu pilihan dan belum ada logikanya, jadi dinonaktifkan. */
const STATUS_VIEW_ITEMS = [{ value: 'recent', label: 'Pesanan terbaru' }];

/** Warna irisan donat: abu-abu netral yang terbaca di terang maupun gelap. */
const STATUS_COLORS = ['#71717a', '#a1a1aa', '#3f3f46', '#d4d4d8', '#52525b'];
/** Ambang stok menipis yang dipakai di halaman ini (sesuai teks "≤ 5 unit"). */
const LOW_STOCK_REF = 5;
/** Angka di tabel dan legenda: sans-serif dengan lebar tetap, tanpa font mono. */
const NUM = 'tabular-nums tracking-[-0.01em]';

const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--sa-popover)',
  color: 'var(--sa-popover-foreground)',
  border: '1px solid var(--sa-border)',
  borderRadius: 8,
  fontSize: 12,
};

/** Isi gradien area: warna teks aktif, pudar ke transparan di bawah garis. */
const AREA_FILL_STOP: CSSProperties = { stopColor: 'currentColor' };

function compactRupiah(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  return `${Math.round(value / 1000).toLocaleString('id-ID')} rb`;
}

/** Hitung jumlah pesanan per status dari daftar pesanan terbaru. */
function countByStatus(orders: AdminDashboardData['recent_orders']): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const o of orders) {
    const { label } = statusInfo(o.status, o.payment_status);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count }));
}

export default function AdminDashboard() {
  const dash = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.adminDashboard, refetchInterval: 60_000 });
  const [series, setSeries] = useState<Series>('7d');

  if (dash.isPending) return <p className="text-muted-foreground">Memuat ringkasan…</p>;
  if (dash.isError || !dash.data) return <p className="rounded-field bg-error-soft px-3.5 py-2.5 text-sm text-on-error-soft">Gagal memuat ringkasan.</p>;
  const d = dash.data;

  const daily: Point[] = d.sales_7d.map((x) => ({ label: DAY.format(new Date(`${x.day}T00:00:00Z`)), value: Number(x.total) }));
  /* DEMO: deret 6 bulan adalah data contoh dari src/data/demo.ts. */
  const monthly: Point[] = DEMO_MONTHLY_SALES.map((m) => ({ label: m.label, value: m.value }));
  const points = series === '7d' ? daily : monthly;
  const average = points.reduce((sum, p) => sum + p.value, 0) / Math.max(1, points.length);

  /* Pendapatan hari ini dibanding rata-rata 6 hari sebelumnya (data nyata dari sales_7d). */
  const today = daily[daily.length - 1]?.value ?? 0;
  const earlier = daily.slice(0, -1);
  const earlierAvg = earlier.reduce((sum, p) => sum + p.value, 0) / Math.max(1, earlier.length);
  const deltaPct = earlierAvg > 0 ? Math.round(((today - earlierAvg) / earlierAvg) * 100) : null;

  const statusSlices = countByStatus(d.recent_orders);
  const updatedAt = dash.dataUpdatedAt ? TIME.format(new Date(dash.dataUpdatedAt)) : '';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Ringkasan penjualan</h1>
        <p className="text-sm text-muted-foreground">{DATE_LONG.format(new Date())}</p>
      </header>

      <Tabs defaultValue="ringkasan" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            <TabsTrigger value="pesanan">Pesanan</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {updatedAt && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="material-symbols-outlined text-[16px]" aria-hidden>update</span>
                Diperbarui {updatedAt}
              </span>
            )}
            <Button size="sm" variant="outline" className="text-foreground" render={<Link to="/admin/store" />} nativeButton={false}>
              <span className="material-symbols-outlined" aria-hidden>settings</span>
              Pengaturan
            </Button>
            {/* DEMO: unduh rekap belum punya API, jadi dinonaktifkan. */}
            <Button size="sm" variant="outline" className="text-foreground" disabled title="Belum tersedia">
              <span className="material-symbols-outlined" aria-hidden>download</span>
              Unduh rekap
              <span className={DEMO_TAG}>Demo</span>
            </Button>
            <Button size="sm" render={<Link to="/admin/products" />} nativeButton={false}>
              <span className="material-symbols-outlined" aria-hidden>add</span>
              Kelola produk
            </Button>
          </div>
        </div>

        <TabsContent value="ringkasan" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total pendapatan"
              icon="payments"
              value={rp(d.revenue_total)}
              note={`${d.orders_total} pesanan lunas`}
              delta={
                deltaPct === null
                  ? undefined
                  : {
                      text: `${deltaPct > 0 ? '+' : ''}${deltaPct}%`,
                      up: deltaPct >= 0,
                      title: 'Pendapatan hari ini dibanding rata-rata 6 hari sebelumnya',
                    }
              }
            />
            <KpiCard icon="local_shipping" title="Perlu dikirim" value={d.orders_to_ship} note="pesanan lunas menunggu dikirim" />
            <KpiCard icon="inventory_2" title="Produk aktif" value={d.active_products} note="produk tampil di katalog" />
            <KpiCard
              icon="production_quantity_limits"
              title="Stok menipis"
              value={d.low_stock_count}
              note={d.low_stock_count > 0 ? 'Perlu restok (≤ 5 unit)' : 'Semua stok aman'}
              noteClass={d.low_stock_count > 0 ? 'font-semibold text-destructive' : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Card className="min-w-0 gap-4 xl:col-span-7">
              <CardHeader>
                <CardTitle className="font-normal">Tren penjualan</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  {series === '7d' ? 'Pendapatan harian · garis putus-putus = rata-rata' : 'Pendapatan bulanan · garis putus-putus = rata-rata'}
                  {series === '6m' && <span className={DEMO_TAG}>Demo</span>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Select
                    value={series}
                    onValueChange={(value) => {
                      if (value === '7d' || value === '6m') setSeries(value);
                    }}
                    items={PERIOD_ITEMS}
                  >
                    <SelectTrigger size="sm" className={cx(TOUCH_BTN, 'w-40')} aria-label="Rentang grafik">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PERIOD_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {/* DEMO: laporan lengkap belum punya halaman atau API, jadi dinonaktifkan. */}
                  <Button variant="outline" size="sm" className={cx(TOUCH_BTN, 'text-foreground')} disabled title="Belum tersedia">
                    Lihat laporan
                    <span className={DEMO_TAG}>Demo</span>
                  </Button>
                </div>
                <ul className="m-0 mb-3 flex list-none flex-wrap justify-end gap-x-5 gap-y-1.5 p-0 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-foreground" aria-hidden />
                    Pendapatan
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-0 w-3 border-t border-dashed border-foreground/60" aria-hidden />
                    Rata-rata
                  </li>
                </ul>
                <div className="h-64 w-full text-foreground sm:h-72" role="img" aria-label={series === '7d' ? 'Grafik pendapatan 7 hari terakhir' : 'Grafik pendapatan 6 bulan (contoh)'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tren-penjualan-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" style={{ ...AREA_FILL_STOP, stopOpacity: 0.18 }} />
                          <stop offset="100%" style={{ ...AREA_FILL_STOP, stopOpacity: 0 }} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                      />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip
                        cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(value) => rp(Number(value))}
                      />
                      <ReferenceLine y={average} stroke="currentColor" strokeDasharray="4 4" strokeOpacity={0.6} />
                      <Area
                        name="Pendapatan"
                        type="monotone"
                        dataKey="value"
                        stroke="currentColor"
                        strokeWidth={2}
                        fill="url(#tren-penjualan-fill)"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className={cx(MUTED_SMALL, 'mt-2')}>Rata-rata {compactRupiah(average)} per {series === '7d' ? 'hari' : 'bulan'}</p>
              </CardContent>
            </Card>

            <Card className="min-w-0 gap-4 xl:col-span-5">
              <CardHeader>
                <CardTitle className="font-normal">Status pesanan</CardTitle>
                <CardDescription>Dari {d.recent_orders.length} pesanan terbaru</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center justify-end gap-2">
                  <Select disabled defaultValue="recent" items={STATUS_VIEW_ITEMS}>
                    <SelectTrigger size="sm" className={cx(TOUCH_BTN, 'w-40')} aria-label="Tampilan status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {STATUS_VIEW_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {/* DEMO: pilihan tampilan belum punya logika, jadi dinonaktifkan. */}
                  <span className={DEMO_TAG}>Demo</span>
                </div>
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                {statusSlices.length === 0 ? (
                  <p className={MUTED_SMALL}>Belum ada pesanan.</p>
                ) : (
                  <>
                    <div className="relative h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusSlices}
                            dataKey="count"
                            nameKey="label"
                            innerRadius="64%"
                            outerRadius="100%"
                            stroke="none"
                            isAnimationActive={false}
                          >
                            {statusSlices.map((s, i) => (
                              <Cell key={s.label} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-2xl font-semibold text-foreground">{d.recent_orders.length}</span>
                        <span className="text-xs text-muted-foreground">pesanan</span>
                      </div>
                    </div>
                    <ul className="m-0 flex w-full min-w-0 list-none flex-col gap-2.5 p-0 text-sm">
                      {statusSlices.map((s, i) => (
                        <li key={s.label} className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} aria-hidden />
                            <span className="truncate text-foreground">{s.label}</span>
                          </span>
                          <span className={cx(NUM, 'text-muted-foreground')}>{s.count}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            <Card className="min-w-0 gap-4 md:col-span-2 xl:col-span-5">
              <CardHeader>
                <CardTitle className="font-normal">Stok menipis</CardTitle>
                <CardAction>
                  <Button variant="ghost" size="sm" className={cx(TOUCH_BTN, 'text-foreground')} render={<Link to="/admin/products" />} nativeButton={false}>
                    Lihat semua
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {d.low_stock.length === 0 && <p className={MUTED_SMALL}>Tidak ada produk dengan stok menipis.</p>}
                <ul className="m-0 flex list-none flex-col gap-4 p-0">
                  {d.low_stock.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                          <span className={cx(SKU, 'block truncate text-left text-xs text-muted-foreground')}>{p.sku}</span>
                        </div>
                        <Badge variant="outline" className={cx('shrink-0', p.stock <= 2 ? 'border-destructive/30 text-destructive' : 'text-muted-foreground')}>
                          Sisa {p.stock}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden>
                        <div
                          className={cx('h-full rounded-full', p.stock <= 2 ? 'bg-destructive' : 'bg-foreground')}
                          style={{ width: `${Math.min(100, (p.stock / LOW_STOCK_REF) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="min-w-0 gap-4 xl:col-span-3">
              <CardHeader>
                <CardTitle className="font-normal">Perlu dikirim</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <div className="font-display text-4xl font-semibold tracking-tight text-foreground">{d.orders_to_ship}</div>
                  <p className="mt-2 text-sm text-muted-foreground">pesanan lunas menunggu diproses dan dikirim.</p>
                </div>
                <Button variant="outline" className="text-foreground" render={<Link to="/admin/orders" />} nativeButton={false}>
                  Kelola pesanan
                </Button>
              </CardContent>
            </Card>

            <Card className="min-w-0 gap-4 md:col-span-2 xl:col-span-4">
              <CardHeader>
                <CardTitle className="font-normal">Aksi cepat</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start text-foreground" render={<Link to="/admin/products" />} nativeButton={false}>
                    <span className="material-symbols-outlined" aria-hidden>inventory_2</span>
                    Produk
                  </Button>
                  <Button variant="outline" className="justify-start text-foreground" render={<Link to="/admin/orders" />} nativeButton={false}>
                    <span className="material-symbols-outlined" aria-hidden>receipt_long</span>
                    Pesanan
                  </Button>
                  <Button variant="outline" className="justify-start text-foreground" render={<Link to="/admin/promos" />} nativeButton={false}>
                    <span className="material-symbols-outlined" aria-hidden>sell</span>
                    Promo
                  </Button>
                  <Button variant="outline" className="justify-start text-foreground" render={<Link to="/admin/reviews" />} nativeButton={false}>
                    <span className="material-symbols-outlined" aria-hidden>rate_review</span>
                    Ulasan
                  </Button>
                </div>
                <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
                  <span className="pb-1 text-xs font-semibold text-muted-foreground">Pintasan</span>
                  <Link to="/admin/aktivitas" className="rounded-md px-2 py-1.5 font-medium text-foreground no-underline hover:bg-hover hover:no-underline">
                    Aktivitas
                  </Link>
                  <Link to="/admin/store" className="rounded-md px-2 py-1.5 font-medium text-foreground no-underline hover:bg-hover hover:no-underline">
                    Data toko
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pesanan">
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
              <CardTitle className="font-normal">Pesanan terbaru</CardTitle>
              <CardDescription>{d.recent_orders.length} pesanan terbaru</CardDescription>
              <CardAction className="flex flex-wrap items-center justify-end gap-2">
                {/* DEMO: ekspor rekap dari ringkasan belum punya API, jadi dinonaktifkan. */}
                <Button variant="outline" className={cx(TOUCH_BTN, 'text-foreground')} disabled title="Belum tersedia">
                  <span className="material-symbols-outlined" aria-hidden>download</span>
                  Export
                  <span className={DEMO_TAG}>Demo</span>
                </Button>
                <Button variant="ghost" className={cx(TOUCH_BTN, 'text-foreground')} render={<Link to="/admin/orders" />} nativeButton={false}>
                  Kelola pesanan
                </Button>
              </CardAction>
            </CardHeader>
            {/* DEMO: cari, filter status, dan urutkan di ringkasan belum punya logika, jadi dinonaktifkan. */}
            <div className="flex flex-col gap-2 px-4 pb-3 pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted" aria-hidden>search</span>
                  <Input
                    type="search"
                    disabled
                    placeholder="Cari invoice atau pembeli…"
                    aria-label="Cari pesanan (belum tersedia)"
                    className={cx(TOUCH_BTN, 'w-full rounded-field border-outline bg-surface pl-10 pr-16 text-sm text-ink placeholder:text-muted')}
                  />
                  <span className={cx(DEMO_TAG, 'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2')}>Demo</span>
                </div>
                <Button variant="outline" size="sm" className={cx(TOUCH_BTN, 'text-foreground')} disabled title="Belum tersedia">
                  <span className="material-symbols-outlined" aria-hidden>filter_list</span>
                  Status
                  <span className={DEMO_TAG}>Demo</span>
                </Button>
              </div>
              <Button variant="outline" size="sm" className={cx(TOUCH_BTN, 'text-foreground')} disabled title="Belum tersedia">
                <span className="material-symbols-outlined" aria-hidden>swap_vert</span>
                Sort
                <span className={DEMO_TAG}>Demo</span>
              </Button>
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
                    <TableRow key={o.id} className="border-border">
                      <TableCell data-label="" className={cx('px-3 py-3 sm:px-4', SKU, 'max-md:block!')}>{o.invoice_no}</TableCell>
                      <TableCell data-label="Pembeli" className="px-3 py-3 sm:px-4">{o.buyer_name ?? '-'}</TableCell>
                      <TableCell data-label="Waktu" className={cx('px-3 py-3 sm:px-4', MUTED_SMALL, HIDE_MD)}>{formatDate(o.created_at)}</TableCell>
                      <TableCell data-label="Status" className="px-3 py-3 sm:px-4">
                        <Badge variant="outline" className={cx('h-6 whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold', TONE_BADGE[s.tone])}>{s.label}</Badge>
                      </TableCell>
                      <TableCell data-label="Total" className={cx('whitespace-nowrap px-3 py-3 text-right sm:px-4', NUM)}>{rp(o.grand_total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
