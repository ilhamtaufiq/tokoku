import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { useToast } from '../components/Toast';
import { CARD, FORM_CARD, INPUT, LABEL, Notice, btn } from './admin/adminUi';

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
        <Link to="/login" className={btn('primary', 'md', 'mt-4')}>
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
        <div className={`${CARD} p-5`}>
          <p className="m-0 text-sm text-muted">Toko kamu</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{store.name}</h2>
          <p className="mt-2 text-sm">{STATUS_TEXT[store.status] ?? store.status}</p>
        </div>
      ) : (
        <form
          className={FORM_CARD}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            apply.mutate();
          }}
        >
          <label className={LABEL}>
            Nama toko
            <input required minLength={3} maxLength={120} className={INPUT}
              value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
          </label>
          <label className={LABEL}>
            NPWP toko (opsional)
            <input inputMode="numeric" className={INPUT}
              value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} placeholder="15 atau 16 digit" />
          </label>
          <label className={LABEL}>
            Alamat
            <textarea rows={2} className={INPUT}
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label className={LABEL}>
            Telepon
            <input className={INPUT}
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          {error && <Notice kind="error">{error}</Notice>}
          <button className={btn('primary', 'md', 'w-full')} disabled={apply.isPending}>
            {apply.isPending ? 'Mengirim…' : 'Ajukan toko'}
          </button>
        </form>
      )}
    </section>
  );
}
