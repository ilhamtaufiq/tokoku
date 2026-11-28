import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import type { StoreInfo } from '../../api/types';
import { DestinationSearch } from '../../components/DestinationSearch';
import type { ShippingDestination } from '../../api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { FIELD_HINT, FIELD_INPUT, FIELD_LABEL, Notice, PANEL } from '../../components/admin-stores/AdminBits';

export default function AdminStore() {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ['admin-store'], queryFn: api.adminStore });
  // Draft hanya terisi saat pengguna mengetik; sebelum itu nilai diambil langsung dari server.
  const base: StoreInfo = store.data ?? { name: '', npwp: '', address: '', phone: '', origin_location_id: null, origin_label: null };
  const [draft, setDraft] = useState<StoreInfo | null>(null);
  const form = draft ?? base;
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const save = useMutation({
    mutationFn: () => api.adminUpdateStore(form),
    onSuccess: (saved) => {
      setDraft(saved);
      setMessage({ kind: 'ok', text: 'Data toko tersimpan. Akan muncul di invoice berikutnya.' });
      queryClient.invalidateQueries({ queryKey: ['store'] });
    },
    onError: (e) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Gagal menyimpan.' }),
  });

  const set = (key: keyof StoreInfo, value: string) => setDraft({ ...form, [key]: value });

  if (store.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-sub">Memuat data toko…</p>
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    );
  }

  return (
    <section>
      <PageHeader
        crumbs={['Portal penjual', 'Fiskal & rekening', 'Data toko']}
        title="Data toko"
        subtitle="Data ini dicetak di invoice. Isi NPWP dan alamat sesuai dokumen perpajakan toko."
        actions={
          /* DEMO: unduh sertifikat belum punya API, jadi nonaktif. */
          <Button type="button" variant="outline" disabled title="Belum tersedia" className="h-11 md:h-9">
            <span className="material-symbols-outlined" aria-hidden>download</span>
            Unduh sertifikat (PDF)
            <Badge variant="outline" className="h-5 rounded-pill border-dashed px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-sub">
              Demo
            </Badge>
          </Button>
        }
      />
      <Card className={`${PANEL} max-w-2xl gap-0 py-0`}>
        <form
          className="flex flex-col gap-4 p-4 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            save.mutate();
          }}
        >
          <label className={FIELD_LABEL}>
            Nama toko
            <Input className={FIELD_INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={120} />
          </label>
          <label className={FIELD_LABEL}>
            <span>NPWP toko <span className={FIELD_HINT}>(15 atau 16 digit)</span></span>
            <Input className={FIELD_INPUT} value={form.npwp} onChange={(e) => set('npwp', e.target.value)} placeholder="01.234.567.8-901.000" />
          </label>
          <label className={FIELD_LABEL}>
            Alamat
            <Textarea className="min-h-20 text-sm" rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </label>
          <label className={FIELD_LABEL}>
            Telepon
            <Input className={FIELD_INPUT} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </label>
          <label className={FIELD_LABEL}>
            <span>Lokasi asal pengiriman <span className={FIELD_HINT}>(untuk cek ongkir)</span></span>
            <DestinationSearch
              id="origin-search"
              value={form.origin_location_id && form.origin_label ? { id: form.origin_location_id, label: form.origin_label } : null}
              onChange={(dest: ShippingDestination | null) =>
                setDraft({ ...form, origin_location_id: dest?.id ?? null, origin_label: dest?.label ?? null })
              }
            />
          </label>
          {message && <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>}
          <Button type="submit" className="h-11 w-full md:h-9" disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </form>
      </Card>
    </section>
  );
}
