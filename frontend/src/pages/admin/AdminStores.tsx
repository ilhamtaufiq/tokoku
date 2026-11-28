import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/money';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, FilterChip, Notice, PANEL, StatusPill, type Tone } from '../../components/admin-stores/AdminBits';

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
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter status toko">
        {STATUS_FILTERS.map((s) => (
          <FilterChip key={s || 'all'} on={status === s} onClick={() => setStatus(s)}>
            {s ? STATUS_LABEL[s] : 'Semua'}
          </FilterChip>
        ))}
      </div>
      {error && <Notice kind="error" className="mb-4">{error}</Notice>}
      <div className="grid gap-3 md:grid-cols-2">
        {(stores.data ?? []).map((s) => (
          <Card key={s.id} className={`${PANEL} flex flex-col gap-3 p-4 sm:p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="font-display text-base font-semibold text-ink">{s.name}</strong>
                <p className="m-0 mt-0.5 break-all text-xs text-sub">{s.owner_email} · {formatDate(s.created_at)}</p>
                {s.npwp && <p className="m-0 mt-0.5 font-mono text-xs text-sub">NPWP {s.npwp}</p>}
              </div>
              <StatusPill tone={STATUS_TONE[s.status] ?? 'neutral'}>{STATUS_LABEL[s.status]}</StatusPill>
            </div>
            <div className="flex flex-wrap gap-2">
              {s.status !== 'active' && (
                <Button
                  type="button"
                  className="h-11 px-4 md:h-9"
                  onClick={() => setStatusMutation.mutate({ id: s.id, to: 'active' })}
                >
                  Setujui
                </Button>
              )}
              {s.status === 'active' && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-error bg-surface px-4 text-error hover:bg-error-soft md:h-9"
                  onClick={() => setStatusMutation.mutate({ id: s.id, to: 'suspended' })}
                >
                  Tangguhkan
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {stores.data?.length === 0 && <EmptyState>Tidak ada toko pada filter ini.</EmptyState>}
    </section>
  );
}
