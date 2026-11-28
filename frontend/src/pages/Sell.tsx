import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { useToast } from '../components/Toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FIELD_INPUT, FIELD_LABEL, Notice, PANEL } from '../components/admin-stores/AdminBits';

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
        <p className="text-sub">Masuk dulu, lalu ajukan toko kamu.</p>
        <Button render={<Link to="/login" />} className="mt-4 h-11 px-4 md:h-9">
          Masuk
        </Button>
      </section>
    );
  }

  const store = mine.data;
  return (
    <section className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">Jual di Tokoku</h1>
      <p className="mb-6 text-sub">Satu akun, satu toko. Setelah disetujui, kamu bisa mengelola produk dan pesanan sendiri.</p>

      {store ? (
        <Card className={`${PANEL} gap-1 p-5`}>
          <p className="m-0 text-sm text-sub">Toko kamu</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{store.name}</h2>
          <p className="mt-2 text-sm">{STATUS_TEXT[store.status] ?? store.status}</p>
        </Card>
      ) : (
        <Card className={`${PANEL} gap-0 py-0`}>
          <form
            className="flex flex-col gap-4 p-4 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              apply.mutate();
            }}
          >
            <label className={FIELD_LABEL}>
              Nama toko
              <Input required minLength={3} maxLength={120} className={FIELD_INPUT}
                value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            </label>
            <label className={FIELD_LABEL}>
              NPWP toko (opsional)
              <Input inputMode="numeric" className={FIELD_INPUT}
                value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} placeholder="15 atau 16 digit" />
            </label>
            <label className={FIELD_LABEL}>
              Alamat
              <Textarea rows={2} className="min-h-16 text-sm"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className={FIELD_LABEL}>
              Telepon
              <Input className={FIELD_INPUT}
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            {error && <Notice kind="error">{error}</Notice>}
            <Button type="submit" className="h-11 w-full md:h-9" disabled={apply.isPending}>
              {apply.isPending ? 'Mengirim…' : 'Ajukan toko'}
            </Button>
          </form>
        </Card>
      )}
    </section>
  );
}
