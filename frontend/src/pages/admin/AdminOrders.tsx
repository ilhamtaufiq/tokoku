import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { OrderStatus } from '../../api/types';
import { ORDER_STATUS_LABEL, formatDate, rp, sisaWaktu } from '../../lib/money';
import {
  ACTIONS,
  CHIP_GROUP,
  EMPTY_ROW,
  FILTER_BAR,
  HIDE_LG,
  HIDE_MD,
  INPUT,
  LABEL,
  MUTED_SMALL,
  Notice,
  SEARCH_ICON,
  SEARCH_WRAP,
  SKU,
  StatusBadge,
  TABLE,
  TABLE_WRAP,
  TBODY,
  TD,
  TH,
  btn,
  chipClass,
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
        title="Pesanan"
        subtitle={orders.data ? `${visible.length} pesanan${search.trim() ? ' cocok dengan pencarian' : ''}` : 'Memuat pesanan…'}
        actions={
          <button
            type="button"
            className={btn('ghost', 'sm')}
            onClick={() => api.adminExportOrdersCsv(status).catch((e) => setError(e instanceof ApiError ? e.message : 'Ekspor gagal.'))}
          >
            Ekspor CSV
          </button>
        }
      />
      <div className={FILTER_BAR}>
        <div className={SEARCH_WRAP}>
          <span className={SEARCH_ICON} aria-hidden>search</span>
          <input
            type="search"
            className={cx(INPUT, 'pl-10')}
            placeholder="Cari nomor invoice atau nama pembeli…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari pesanan"
          />
        </div>
        <div className={CHIP_GROUP} role="group" aria-label="Filter status">
          {STATUS_CHIPS.map((c) => (
            <button
              type="button"
              key={c.value}
              className={chipClass(status === c.value)}
              aria-pressed={status === c.value}
              onClick={() => setStatus(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Invoice</th>
              <th className={cx(TH, HIDE_MD)}>Tanggal</th>
              <th className={cx(TH, 'text-right')}>Total</th>
              <th className={cx(TH, HIDE_LG, 'text-right')}>PPN</th>
              <th className={TH}>Status</th>
              <th className={cx(TH, HIDE_MD)}>Pembayaran</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody className={TBODY}>
            {visible.map((o) => {
              const next = NEXT[o.status];
              const canRefund = o.payment_status === 'paid' && (o.status === 'paid' || o.status === 'processing');
              const isOpen = pending?.id === o.id;
              return (
                <Fragment key={o.id}>
                  <tr>
                    <td className={cx(TD, 'min-w-[120px]')}>
                      <Link to={`/admin/orders/${o.id}`} className="font-semibold text-primary hover:underline">{o.invoice_no}</Link>
                    </td>
                    <td className={cx(TD, HIDE_MD, MUTED_SMALL)}>{formatDate(o.created_at)}</td>
                    <td className={cx(TD, 'whitespace-nowrap text-right tabular-nums')}>{rp(o.grand_total)}</td>
                    <td className={cx(TD, HIDE_LG, 'whitespace-nowrap text-right tabular-nums text-muted')}>{rp(o.ppn_total)}</td>
                    <td className={TD}>
                      <StatusBadge tone={TONE_BY_STATUS[o.status] ?? 'neutral'}>{ORDER_STATUS_LABEL[o.status]}</StatusBadge>
                      {o.estimated_days && <div className={cx(MUTED_SMALL, 'mt-1.5')}>Estimasi {o.estimated_days} hari</div>}
                      {o.estimated_due_at && <div className={MUTED_SMALL}>Tenggat {formatDate(o.estimated_due_at)} · {sisaWaktu(o.estimated_due_at)}</div>}
                      {o.tracking_number && <div className={cx(SKU, 'mt-0.5')}>Resi {o.tracking_number}</div>}
                    </td>
                    <td className={cx(TD, HIDE_MD)}>
                      <StatusBadge tone={o.payment_status === 'paid' ? 'ok' : o.payment_status === 'refunded' ? 'danger' : 'neutral'}>
                        {o.payment_status}
                      </StatusBadge>
                    </td>
                    <td className={cx(TD, 'whitespace-nowrap')}>
                      <div className="flex flex-col items-start gap-1">
                        {next === 'shipped' && (
                          <button type="button" className={btn('link', 'link')} onClick={() => openAction({ id: o.id, kind: 'ship' })}>
                            → Dikirim
                          </button>
                        )}
                        {next === 'processing' && (
                          <button type="button" className={btn('link', 'link')} onClick={() => openAction({ id: o.id, kind: 'process' })}>
                            → Proses
                          </button>
                        )}
                        {next && next !== 'shipped' && next !== 'processing' && (
                          <button type="button" className={btn('link', 'link')} disabled={advance.isPending} onClick={() => advance.mutate({ id: o.id, to: next })}>
                            → {ORDER_STATUS_LABEL[next]}
                          </button>
                        )}
                        {canRefund && (
                          <button type="button" className={btn('linkDanger', 'link')} onClick={() => openAction({ id: o.id, kind: 'refund' })}>
                            Batalkan + refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && pending && (
                    <tr className="bg-surface-low">
                      <td colSpan={7} className="px-3 py-3 sm:px-4">
                        <form
                          className={cx(ACTIONS, 'items-end')}
                          onSubmit={(e) => {
                            e.preventDefault();
                            confirm.mutate();
                          }}
                        >
                          <label className={cx(LABEL, 'min-w-0 flex-1 basis-64')}>
                            {pending.kind === 'process' && 'Estimasi pengiriman (hari)'}
                            {pending.kind === 'ship' && 'Nomor resi pengiriman'}
                            {pending.kind === 'refund' && 'Catatan refund (mis. nomor transfer manual, minimal 5 karakter)'}
                            <input
                              className={INPUT}
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              required
                              autoFocus
                              type={pending.kind === 'process' ? 'number' : 'text'}
                              min={pending.kind === 'process' ? 1 : undefined}
                              max={pending.kind === 'process' ? 365 : undefined}
                            />
                          </label>
                          <button
                            type="submit"
                            className={btn(pending.kind === 'refund' ? 'danger' : 'primary')}
                            disabled={confirm.isPending}
                          >
                            {pending.kind === 'process' && 'Simpan & proses pesanan'}
                            {pending.kind === 'ship' && 'Simpan & tandai dikirim'}
                            {pending.kind === 'refund' && 'Konfirmasi pembatalan'}
                          </button>
                          <button type="button" className={btn('ghost')} onClick={() => setPending(null)}>Batal</button>
                        </form>
                        {pending.kind === 'refund' && (
                          <p className={cx(MUTED_SMALL, 'mt-2')}>
                            Uang harus dikembalikan manual lewat dashboard Midtrans. Aksi ini hanya mencatat pembatalan dan mengembalikan stok.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {orders.data?.length === 0 && <p className={EMPTY_ROW}>Belum ada pesanan.</p>}
      </div>
    </section>
  );
}
