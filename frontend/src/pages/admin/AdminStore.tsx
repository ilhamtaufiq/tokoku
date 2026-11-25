import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import type { StoreInfo } from '../../api/types';
import { FORM_CARD, HINT, INPUT, LABEL, Notice, btn } from './adminUi';

export default function AdminStore() {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ['store'], queryFn: api.store });
  // Draft hanya terisi saat pengguna mengetik; sebelum itu nilai diambil langsung dari server.
  const base: StoreInfo = store.data ?? { name: '', npwp: '', address: '', phone: '' };
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

  if (store.isPending) return <p className="text-muted">Memuat data toko…</p>;

  return (
    <section className="mx-auto max-w-[480px]">
      <PageHeader title="Data toko" subtitle="Data ini dicetak di invoice. Isi NPWP dan alamat sesuai dokumen perpajakan toko." />
      <form
        className={FORM_CARD}
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          save.mutate();
        }}
      >
        <label className={LABEL}>
          Nama toko
          <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={120} />
        </label>
        <label className={LABEL}>
          <span>NPWP toko <span className={HINT}>(15 atau 16 digit)</span></span>
          <input className={INPUT} value={form.npwp} onChange={(e) => set('npwp', e.target.value)} placeholder="01.234.567.8-901.000" />
        </label>
        <label className={LABEL}>
          Alamat
          <textarea className={INPUT} rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <label className={LABEL}>
          Telepon
          <input className={INPUT} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        {message && <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>}
        <button type="submit" className={btn('primary', 'md', 'w-full')} disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>
    </section>
  );
}
