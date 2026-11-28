import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { OrderStatus } from '../../api/types';
import { ORDER_STATUS_LABEL, formatDate, rp, sisaWaktu } from '../../lib/money';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TONE_BADGE, TOUCH_BTN } from '../../components/admin/status';
import {
  DEMO_TAG,
  EMPTY_ROW,
  HIDE_MD,
  MONEY,
  MUTED_SMALL,
  Notice,
  SKU,
  TABLE_STACK,
  cx,
  type Tone,
} from './adminUi';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: 'processing',
  processing: 'shipped',
  shipped: 'completed',
};

const TONE_BY_STATUS: Partial<Record<OrderStatus, Tone>> = {
  pending_payment: 'neutral',
  paid: 'warn',
  processing: 'info',
  shipped: 'info',
  completed: 'ok',
  cancelled: 'danger',
};

type Pending = { id: number; kind: 'process' | 'ship' | 'refund' } | null;

const STATUS_CHIPS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Semua' },
  { value: 'paid', label: 'Perlu diproses' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'pending_payment', label: 'Menunggu bayar' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

const PANEL = 'gap-0 overflow-hidden rounded-card border border-outline-soft bg-surface py-0 shadow-card ring-0';
const SELECT = cx(TOUCH_BTN, 'w-full min-w-0 rounded-field border border-outline bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none disabled:opacity-60');
const PAGE_BTN = cx(TOUCH_BTN, 'w-11 px-0');
const ACTION_BTN = 'h-auto min-h-11 justify-start border-transparent bg-transparent px-1.5 font-body text-sm font-semibold hover:bg-transparent md:min-h-0';
const CHIP = 'h-11 whitespace-nowrap rounded-pill px-3.5 text-[13px] font-semibold md:h-8 md:px-3';

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [value, setValue] = useState('');

  const confirm = useMutation({
    mutationFn: () => {
      if (!pending) throw new Error('tidak ada aksi');
      if (pending.kind === 'process') {
        const days = Number(value);
        if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('Estimasi harus 1–365 hari.');
        return api.adminProcessOrder(pending.id, days);
      }
      return pending.kind === 'ship'
        ? api.adminShipOrder(pending.id, value.trim())
        : api.adminRefundCancel(pending.id, value.trim());
    },
    onSuccess: () => {
      setPending(null);
      setValue('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Aksi gagal.'),
  });
  const orders = useQuery({ queryKey: ['admin-orders', status], queryFn: () => api.adminOrders(status) });

  const advance = useMutation({
    mutationFn: ({ id, to }: { id: number; to: OrderStatus }) => api.adminSetOrderStatus(id, to),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Gagal mengubah status.'),
  });

  const visible = (orders.data ?? []).filter((o) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return o.invoice_no.toLowerCase().includes(term) || (o.buyer_name ?? '').toLowerCase().includes(term);
  });

  const openAction = (next: Pending) => {
    setPending(next);
    setValue('');
    setError(null);
  };

  return (
    <section>
      <PageHeader
        crumbs={['Portal penjual', 'Operasional bisnis', 'Pesanan']}
        title="Pesanan"
        subtitle={orders.data ? `${visible.length} pesanan${search.trim() ? ' cocok dengan pencarian' : ''}` : 'Memuat pesanan…'}
        actions={
          <Button
            variant="ghost"
            size="sm"
            className={TOUCH_BTN}
            onClick={() => api.adminExportOrdersCsv(status).catch((e) => setError(e instanceof ApiError ? e.message : 'Ekspor gagal.'))}
          >
            Ekspor CSV
          </Button>
        }
      />

      <Card className={cx(PANEL, 'mb-4 flex-col gap-3 p-3.5 md:flex-row md:flex-wrap md:items-center')}>
        <div className="relative w-full md:min-w-[240px] md:flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted" aria-hidden>search</span>
          <Input
            type="search"
            className={cx(TOUCH_BTN, 'w-full rounded-field border-outline bg-surface pl-10 text-sm text-ink placeholder:text-muted focus-visible:border-primary focus-visible:ring-primary/20')}
            placeholder="Cari nomor invoice atau nama pembeli…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari pesanan"
          />
        </div>
        {/* DEMO: filter periode dan tipe transaksi belum punya parameter API, jadi nonaktif. */}
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <div className="md:w-44">
            <select className={SELECT} disabled aria-label="Periode (belum tersedia)" defaultValue="30">
              <option value="30">30 hari terakhir</option>
            </select>
          </div>
          <div className="md:w-52">
            <select className={SELECT} disabled aria-label="Tipe transaksi (belum tersedia)" defaultValue="all">
              <option value="all">Semua tipe transaksi</option>
            </select>
          </div>
          <Badge variant="outline" className={DEMO_TAG}>Demo</Badge>
          <Button
            variant="outline"
            className={cx(TOUCH_BTN, 'max-md:w-full')}
            onClick={() => {
              setSearch('');
              setStatus('');
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>restart_alt</span>
            Reset
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
          {STATUS_CHIPS.map((c) => (
            <Button
              variant="outline"
              key={c.value}
              className={cx(CHIP, status === c.value ? 'border-primary bg-secondary-container text-on-secondary-container' : 'border-outline bg-surface text-ink-2 hover:border-primary hover:text-primary')}
              aria-pressed={status === c.value}
              onClick={() => setStatus(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </Card>

      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}

      <Card className={PANEL}>
        <Table className={TABLE_STACK}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3 sm:px-4">Invoice</TableHead>
              <TableHead className={cx('px-3 sm:px-4', HIDE_MD)}>Tanggal</TableHead>
              <TableHead className="px-3 text-right sm:px-4">Total</TableHead>
              <TableHead className="hidden px-3 text-right sm:px-4 2xl:table-cell">PPN</TableHead>
              <TableHead className="px-3 sm:px-4">Status</TableHead>
              <TableHead className={cx('px-3 sm:px-4', HIDE_MD)}>Pembayaran</TableHead>
              <TableHead className="px-3 sm:px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((o) => {
              const next = NEXT[o.status];
              const canRefund = o.payment_status === 'paid' && (o.status === 'paid' || o.status === 'processing');
              const isOpen = pending?.id === o.id;
              return (
                <Fragment key={o.id}>
                  <TableRow className="border-outline-soft">
                    <TableCell data-label="Invoice" className="min-w-[120px] px-3 py-3 align-middle sm:px-4">
                      <Link to={`/admin/orders/${o.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline md:min-h-0">{o.invoice_no}</Link>
                    </TableCell>
                    <TableCell data-label="Tanggal" className={cx('px-3 py-3 align-middle sm:px-4', HIDE_MD, MUTED_SMALL)}>{formatDate(o.created_at)}</TableCell>
                    <TableCell data-label="Total" className={cx('whitespace-nowrap px-3 py-3 text-right align-middle sm:px-4', MONEY)}>{rp(o.grand_total)}</TableCell>
                    <TableCell data-label="PPN" className={cx('hidden whitespace-nowrap px-3 py-3 text-right align-middle text-muted sm:px-4 2xl:table-cell', MONEY)}>{rp(o.ppn_total)}</TableCell>
                    <TableCell data-label="Status" className="px-3 py-3 align-middle sm:px-4">
                      <div className="flex min-w-0 flex-col items-end gap-1 text-right md:items-start md:text-left">
                      <Badge variant="outline" className={cx('h-6 whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold', TONE_BADGE[TONE_BY_STATUS[o.status] ?? 'neutral'])}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </Badge>
                      {o.estimated_days && <div className={cx(MUTED_SMALL, 'mt-1.5')}>Estimasi {o.estimated_days} hari</div>}
                      {o.estimated_due_at && <div className={MUTED_SMALL}>Tenggat {formatDate(o.estimated_due_at)} · {sisaWaktu(o.estimated_due_at)}</div>}
                      {o.tracking_number && <div className={cx(SKU, 'mt-0.5')}>Resi {o.tracking_number}</div>}
                      </div>
                    </TableCell>
                    <TableCell data-label="Pembayaran" className={cx('px-3 py-3 align-middle sm:px-4', HIDE_MD)}>
                      <Badge
                        variant="outline"
                        className={cx(
                          'h-6 whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold',
                          TONE_BADGE[o.payment_status === 'paid' ? 'ok' : o.payment_status === 'refunded' ? 'danger' : 'neutral'],
                        )}
                      >
                        {o.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell data-label="" className="whitespace-nowrap px-3 py-3 align-middle sm:px-4">
                      <div className="flex flex-col items-start gap-1">
                        {next === 'shipped' && (
                          <Button variant="link" className={ACTION_BTN} onClick={() => openAction({ id: o.id, kind: 'ship' })}>
                            → Dikirim
                          </Button>
                        )}
                        {next === 'processing' && (
                          <Button variant="link" className={ACTION_BTN} onClick={() => openAction({ id: o.id, kind: 'process' })}>
                            → Proses
                          </Button>
                        )}
                        {next && next !== 'shipped' && next !== 'processing' && (
                          <Button variant="link" className={ACTION_BTN} disabled={advance.isPending} onClick={() => advance.mutate({ id: o.id, to: next })}>
                            → {ORDER_STATUS_LABEL[next]}
                          </Button>
                        )}
                        {canRefund && (
                          <Button variant="link" className={cx(ACTION_BTN, 'text-error')} onClick={() => openAction({ id: o.id, kind: 'refund' })}>
                            Batalkan + refund
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen && pending && (
                    <TableRow className="bg-surface-low hover:bg-surface-low">
                      <TableCell colSpan={7} className="max-md:block! px-3 py-3 sm:px-4">
                        <form
                          className="flex flex-wrap items-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            confirm.mutate();
                          }}
                        >
                          <label className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5 text-[13px] font-semibold text-ink-2">
                            {pending.kind === 'process' && 'Estimasi pengiriman (hari)'}
                            {pending.kind === 'ship' && 'Nomor resi pengiriman'}
                            {pending.kind === 'refund' && 'Catatan refund (mis. nomor transfer manual, minimal 5 karakter)'}
                            <Input
                              className={cx(TOUCH_BTN, 'w-full rounded-field border-outline bg-surface px-3 text-sm text-ink')}
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              required
                              autoFocus
                              type={pending.kind === 'process' ? 'number' : 'text'}
                              min={pending.kind === 'process' ? 1 : undefined}
                              max={pending.kind === 'process' ? 365 : undefined}
                            />
                          </label>
                          <Button
                            type="submit"
                            variant={pending.kind === 'refund' ? 'destructive' : 'default'}
                            className={cx(TOUCH_BTN, pending.kind === 'refund' && 'bg-error text-white hover:bg-error/90')}
                            disabled={confirm.isPending}
                          >
                            {pending.kind === 'process' && 'Simpan & proses pesanan'}
                            {pending.kind === 'ship' && 'Simpan & tandai dikirim'}
                            {pending.kind === 'refund' && 'Konfirmasi pembatalan'}
                          </Button>
                          <Button type="button" variant="ghost" className={TOUCH_BTN} onClick={() => setPending(null)}>Batal</Button>
                        </form>
                        {pending.kind === 'refund' && (
                          <p className={cx(MUTED_SMALL, 'mt-2')}>
                            Uang harus dikembalikan manual lewat dashboard Midtrans. Aksi ini hanya mencatat pembatalan dan mengembalikan stok.
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        {orders.data?.length === 0 && <p className={EMPTY_ROW}>Belum ada pesanan.</p>}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className={MUTED_SMALL}>Menampilkan {visible.length} pesanan{search.trim() ? ' (hasil pencarian)' : ''}</span>
        {/* DEMO: pagination belum ada di API, jadi tombol nonaktif. */}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" className={PAGE_BTN} disabled aria-label="Halaman sebelumnya">
            <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
          </Button>
          <Button variant="default" className={PAGE_BTN} aria-current="page">1</Button>
          <Button variant="outline" className={PAGE_BTN} disabled aria-label="Halaman berikutnya">
            <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
          </Button>
          <Badge variant="outline" className={cx(DEMO_TAG, 'ml-1')}>Demo</Badge>
        </div>
      </div>
    </section>
  );
}
