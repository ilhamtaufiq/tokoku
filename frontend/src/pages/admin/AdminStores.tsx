import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/money';
import { CARD, CHIP_GROUP, EMPTY_ROW, MUTED_SMALL, Notice, SKU, StatusBadge, btn, chipClass, type Tone } from './adminUi';

const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', active: 'Aktif', suspended: 'Ditangguhkan' };
const STATUS_TONE: Record<string, Tone> = { pending: 'warn', active: 'ok', suspended: 'danger' };
const STATUS_FILTERS = ['pending', 'active', 'suspended', ''];

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
      <div className={`${CHIP_GROUP} mb-4`} role="group" aria-label="Filter status toko">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={chipClass(status === s)}
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
          >
            {s ? STATUS_LABEL[s] : 'Semua'}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      <div className="grid gap-3 md:grid-cols-2">
        {(stores.data ?? []).map((s) => (
          <article key={s.id} className={`${CARD} flex flex-col gap-3 p-4 sm:p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="block font-display text-base font-semibold text-ink">{s.name}</strong>
                <p className={`m-0 mt-0.5 break-all ${MUTED_SMALL}`}>{s.owner_email} · {formatDate(s.created_at)}</p>
                {s.npwp && <p className={`m-0 mt-0.5 ${SKU}`}>NPWP {s.npwp}</p>}
              </div>
              <StatusBadge tone={STATUS_TONE[s.status] ?? 'neutral'}>{STATUS_LABEL[s.status]}</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.status !== 'active' && (
                <button type="button" className={btn('primary', 'md')} onClick={() => setStatusMutation.mutate({ id: s.id, to: 'active' })}>
                  Setujui
                </button>
              )}
              {s.status === 'active' && (
                <button type="button" className={btn('outlineDanger', 'md')} onClick={() => setStatusMutation.mutate({ id: s.id, to: 'suspended' })}>
                  Tangguhkan
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {stores.data?.length === 0 && <p className={EMPTY_ROW}>Tidak ada toko pada filter ini.</p>}
    </section>
  );
}
