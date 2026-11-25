import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { OrderStatus } from '../../api/types';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../../lib/money';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: 'processing',
  processing: 'shipped',
  shipped: 'completed',
};

type Pending = { id: number; kind: 'ship' | 'refund' } | null;

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

  return (
    <section>
      <PageHeader
        title="Pesanan"
        subtitle={orders.data ? `${visible.length} pesanan${search.trim() ? ' cocok dengan pencarian' : ''}` : 'Memuat pesanan…'}
      />
      <div className="filter-bar card">
        <div className="search-field">
          <span className="material-symbols-outlined" aria-hidden>search</span>
          <input type="search" placeholder="Cari nomor invoice atau nama pembeli…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari pesanan" />
        </div>
        <div className="chip-group" role="group" aria-label="Filter status">
          {STATUS_CHIPS.map((c) => (
            <button key={c.value} className={`chip ${status === c.value ? 'on' : ''}`} aria-pressed={status === c.value} onClick={() => setStatus(c.value)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Invoice</th><th>Tanggal</th><th>Total</th><th>PPN</th><th>Status</th><th>Pembayaran</th><th /></tr>
          </thead>
          <tbody>
            {visible.map((o) => {
              const next = NEXT[o.status];
              const canRefund = o.payment_status === 'paid' && (o.status === 'paid' || o.status === 'processing');
              const isOpen = pending?.id === o.id;
              return (
                <Fragment key={o.id}>
                <tr>
                  <td>{o.invoice_no}</td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>{rp(o.grand_total)}</td>
                  <td>{rp(o.ppn_total)}</td>
                  <td>
                    {ORDER_STATUS_LABEL[o.status]}
                    {o.tracking_number && <div className="muted small">Resi {o.tracking_number}</div>}
                  </td>
                  <td>{o.payment_status}</td>
                  <td className="actions">
                    {next === 'shipped' && (
                      <button className="btn link" onClick={() => { setPending({ id: o.id, kind: 'ship' }); setValue(''); setError(null); }}>
                        → Dikirim
                      </button>
                    )}
                    {next && next !== 'shipped' && (
                      <button className="btn link" disabled={advance.isPending} onClick={() => advance.mutate({ id: o.id, to: next })}>
                        → {ORDER_STATUS_LABEL[next]}
                      </button>
                    )}
                    {canRefund && (
                      <button className="btn link danger" onClick={() => { setPending({ id: o.id, kind: 'refund' }); setValue(''); setError(null); }}>
                        Batalkan + refund
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && pending && (
                  <tr className="action-row">
                    <td colSpan={7}>
                      <form className="inline-action" onSubmit={(e) => { e.preventDefault(); confirm.mutate(); }}>
                        <label className="grow">
                          {pending.kind === 'ship'
                            ? 'Nomor resi pengiriman'
                            : 'Catatan refund (mis. nomor transfer manual, minimal 5 karakter)'}
                          <input value={value} onChange={(e) => setValue(e.target.value)} required autoFocus />
                        </label>
                        <button className={`btn ${pending.kind === 'refund' ? 'danger-solid' : 'primary'}`} disabled={confirm.isPending}>
                          {pending.kind === 'ship' ? 'Simpan & tandai dikirim' : 'Konfirmasi pembatalan'}
                        </button>
                        <button type="button" className="btn ghost" onClick={() => setPending(null)}>Batal</button>
                      </form>
                      {pending.kind === 'refund' && (
                        <p className="muted small">Uang harus dikembalikan manual lewat dashboard Midtrans. Aksi ini hanya mencatat pembatalan dan mengembalikan stok.</p>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {orders.data?.length === 0 && <p className="muted center">Belum ada pesanan.</p>}
      </div>
    </section>
  );
}
