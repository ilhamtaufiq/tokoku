import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { useToast } from '../components/Toast';

const STATUS_TEXT: Record<string, string> = {
  pending: 'Menunggu persetujuan admin Tokoku.',
  active: 'Toko kamu aktif. Kelola produk dan pesanan dari Admin.',
  suspended: 'Toko kamu sedang ditangguhkan. Hubungi admin Tokoku.',
};

/** Pendaftaran penjual: ajukan toko, lalu admin platform menyetujui. */
export default function Sell() {
  useSeo({ title: 'Jual di Tokoku', description: 'Daftarkan toko kamu dan mulai jual di Tokoku.', canonicalPath: '/jual' });
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ store_name: '', npwp: '', address: '', phone: '' });
  const [error, setError] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ['seller-store'],
    queryFn: async () => {
      try {
        return await api.mySellerStore();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });

  const apply = useMutation({
    mutationFn: () => api.applySeller(form),
    onSuccess: () => {
      toast.show('Pengajuan toko terkirim. Kami kabari setelah disetujui.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Pengajuan gagal. Coba lagi.'),
  });

  if (!user) {
    return (
      <section className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-bold tracking-tight">Jual di Tokoku</h1>
        <p className="text-muted">Masuk dulu, lalu ajukan toko kamu.</p>
        <Link to="/login" className="mt-4 inline-flex h-11 items-center rounded-pill bg-primary px-6 font-semibold text-on-primary no-underline">
          Masuk
        </Link>
      </section>
    );
  }

  const store = mine.data;
  return (
    <section className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Jual di Tokoku</h1>
      <p className="mb-6 text-muted">Satu akun, satu toko. Setelah disetujui, kamu bisa mengelola produk dan pesanan sendiri.</p>

      {store ? (
        <div className="rounded-card border border-outline-soft bg-surface p-5">
          <p className="m-0 text-sm text-muted">Toko kamu</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{store.name}</h2>
          <p className="mt-2 text-sm">{STATUS_TEXT[store.status] ?? store.status}</p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4 rounded-card border border-outline-soft bg-surface p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            apply.mutate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Nama toko
            <input required minLength={3} maxLength={120} className="rounded-field border border-outline bg-surface px-3 py-2.5 font-normal"
              value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            NPWP toko (opsional)
            <input inputMode="numeric" className="rounded-field border border-outline bg-surface px-3 py-2.5 font-normal"
              value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} placeholder="15 atau 16 digit" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Alamat
            <textarea rows={2} className="rounded-field border border-outline bg-surface px-3 py-2.5 font-normal"
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Telepon
            <input className="rounded-field border border-outline bg-surface px-3 py-2.5 font-normal"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          {error && <p className="m-0 rounded-field bg-error-soft px-3 py-2 text-sm text-on-error-soft">{error}</p>}
          <button className="h-11 rounded-pill bg-primary font-semibold text-on-primary disabled:opacity-50" disabled={apply.isPending}>
            {apply.isPending ? 'Mengirim…' : 'Ajukan toko'}
          </button>
        </form>
      )}
    </section>
  );
}
