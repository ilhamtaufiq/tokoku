import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/money';

const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', active: 'Aktif', suspended: 'Ditangguhkan' };

/** Persetujuan toko penjual (khusus admin platform). */
export default function AdminStores() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState<string | null>(null);
  const stores = useQuery({ queryKey: ['admin-stores', status], queryFn: () => api.adminStores(status) });
  const setStatusMutation = useMutation({
    mutationFn: ({ id, to }: { id: number; to: 'active' | 'suspended' }) => api.adminSetStoreStatus(id, to),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Gagal mengubah status toko.'),
  });

  return (
    <section>
      <PageHeader title="Toko penjual" subtitle="Setujui pengajuan toko baru atau tangguhkan toko yang bermasalah." />
      <div className="mb-4 flex flex-wrap gap-2">
        {['pending', 'active', 'suspended', ''].map((s) => (
          <button key={s || 'all'} className={`h-8 rounded-pill border px-3 text-[13px] font-semibold ${status === s ? 'border-primary bg-secondary-container' : 'border-outline bg-surface'}`}
            onClick={() => setStatus(s)}>
            {s ? STATUS_LABEL[s] : 'Semua'}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-field bg-error-soft px-3 py-2 text-sm text-on-error-soft">{error}</p>}
      <div className="flex flex-col gap-3">
        {(stores.data ?? []).map((s) => (
          <article key={s.id} className="rounded-card border border-outline-soft bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <strong className="font-display">{s.name}</strong>
                <p className="m-0 text-xs text-muted">{s.owner_email} · {formatDate(s.created_at)}</p>
                {s.npwp && <p className="m-0 font-mono text-xs text-muted">NPWP {s.npwp}</p>}
              </div>
              <span className="rounded-pill bg-surface-high px-2.5 py-1 text-xs font-semibold">{STATUS_LABEL[s.status]}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {s.status !== 'active' && (
                <button className="h-9 rounded-field bg-primary px-4 text-sm font-semibold text-on-primary" onClick={() => setStatusMutation.mutate({ id: s.id, to: 'active' })}>
                  Setujui
                </button>
              )}
              {s.status === 'active' && (
                <button className="h-9 rounded-field border border-error px-4 text-sm font-semibold text-error" onClick={() => setStatusMutation.mutate({ id: s.id, to: 'suspended' })}>
                  Tangguhkan
                </button>
              )}
            </div>
          </article>
        ))}
        {stores.data?.length === 0 && <p className="text-center text-muted">Tidak ada toko pada filter ini.</p>}
      </div>
    </section>
  );
}
