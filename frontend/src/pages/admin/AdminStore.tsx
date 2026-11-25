import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import type { StoreInfo } from '../../api/types';

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

  if (store.isPending) return <p className="muted">Memuat data toko…</p>;

  return (
    <section className="narrow wide">
      <PageHeader title="Data toko" subtitle="Data ini dicetak di invoice. Isi NPWP dan alamat sesuai dokumen perpajakan toko." />
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          save.mutate();
        }}
      >
        <label>
          Nama toko
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={120} />
        </label>
        <label>
          NPWP toko <span className="muted small">(15 atau 16 digit)</span>
          <input value={form.npwp} onChange={(e) => set('npwp', e.target.value)} placeholder="01.234.567.8-901.000" />
        </label>
        <label>
          Alamat
          <textarea rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <label>
          Telepon
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}
        <button className="btn primary block" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
      </form>
    </section>
  );
}
