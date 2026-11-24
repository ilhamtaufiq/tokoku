import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { OrderStatus } from '../../api/types';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../../lib/money';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: 'processing',
  processing: 'shipped',
  shipped: 'completed',
};

export default function AdminOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const orders = useQuery({ queryKey: ['admin-orders', status], queryFn: () => api.adminOrders(status) });

  const advance = useMutation({
    mutationFn: ({ id, to }: { id: number; to: OrderStatus }) => api.adminSetOrderStatus(id, to),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Gagal mengubah status.'),
  });

  return (
    <section>
      <div className="toolbar">
        <h1>Pesanan</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')} aria-label="Filter status">
          <option value="">Semua status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Invoice</th><th>Tanggal</th><th>Total</th><th>PPN</th><th>Status</th><th>Pembayaran</th><th /></tr>
          </thead>
          <tbody>
            {orders.data?.map((o) => {
              const next = NEXT[o.status];
              return (
                <tr key={o.id}>
                  <td>{o.invoice_no}</td>
                  <td>{formatDate(o.created_at)}</td>
                  <td>{rp(o.grand_total)}</td>
                  <td>{rp(o.ppn_total)}</td>
                  <td>{ORDER_STATUS_LABEL[o.status]}</td>
                  <td>{o.payment_status}</td>
                  <td className="actions">
                    {next && (
                      <button className="btn link" disabled={advance.isPending} onClick={() => advance.mutate({ id: o.id, to: next })}>
                        → {ORDER_STATUS_LABEL[next]}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.data?.length === 0 && <p className="muted center">Belum ada pesanan.</p>}
      </div>
    </section>
  );
}
