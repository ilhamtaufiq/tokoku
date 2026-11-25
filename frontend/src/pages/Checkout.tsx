import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
import { CheckoutSkeleton } from '../components/FlowSkeleton';
import { alertError, btn, card, field, label, pageSub, pageTitle, sectionTitle } from '../components/flowClasses';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

export default function Checkout() {
  useSeo({ title: 'Checkout', noindex: true });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const [address, setAddress] = useState('');
  const [npwp, setNpwp] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = (cart.data ?? []).filter((i) => i.selected);
  const ready = items.length > 0 && items.every((i) => i.is_active && i.stock >= i.qty);

  const preview = useQuery({
    queryKey: ['preview', 'checkout', appliedPromo, items.map((i) => [i.product_id, i.variant_id, i.qty])],
    queryFn: () => api.preview(items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })), appliedPromo),
    enabled: ready,
    retry: false,
  });

  const checkout = useMutation({
    mutationFn: () =>
      api.checkout({
        shipping_address: address.trim(),
        promo_code: appliedPromo || undefined,
        buyer_npwp: npwp.trim() || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (res.payment_url) {
        window.location.assign(res.payment_url);
      } else {
        navigate(`/orders/${res.order.id}`, { state: { paymentFailed: true } });
      }
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Checkout gagal. Coba lagi.'),
  });

  if (cart.isPending) {
    return (
      <div role="status">
        <span className="sr-only">Memuat…</span>
        <CheckoutSkeleton />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <section className="px-4 py-16 text-center">
        <h1 className={pageTitle}>Keranjang kosong</h1>
        <p className="mb-6 text-muted">Belum ada barang yang dipilih di keranjang.</p>
        <Link to="/cart" className={btn('primary', 'md')}>Kembali ke keranjang</Link>
      </section>
    );
  }

  const canSubmit = ready && address.trim().length >= 10 && !checkout.isPending;

  return (
    <section>
      <h1 className={pageTitle}>Checkout</h1>
      <p className={pageSub}>Lengkapi alamat, lalu bayar dengan aman lewat Midtrans.</p>
      {!ready && (
        <p className={`${alertError} mb-4`}>Ada produk yang tidak tersedia atau stoknya kurang. Kembali ke keranjang untuk menyesuaikan.</p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <form
          className="flex min-w-0 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            checkout.mutate();
          }}
        >
          <div className={`${card} p-5 md:p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
              <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden>location_on</span>Alamat pengiriman
            </h2>
            <p className="-mt-1 mb-4 text-[13px] text-muted">Tulis alamat lengkap termasuk nama penerima dan nomor telepon.</p>
            <label className={label}>
              Alamat lengkap
              <textarea
                rows={4}
                className={`${field} resize-y`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nama penerima, alamat lengkap, kota, kode pos, nomor telepon"
                required
                minLength={10}
              />
            </label>
          </div>

          <div className={`${card} p-5 md:p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
              <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden>receipt_long</span>Faktur pajak
            </h2>
            <p className="-mt-1 mb-4 text-[13px] text-muted">Opsional. Isi jika kamu membutuhkan faktur pajak atas nama NPWP.</p>
            <label className={label}>
              NPWP pembeli
              <input className={field} value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="15 atau 16 digit" />
            </label>
          </div>

          <div className={`${card} p-5 md:p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
              <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden>payments</span>Metode pembayaran
            </h2>
            <p className="flex items-start gap-2.5 rounded-field bg-surface-low p-3.5 text-sm text-ink-2">
              <span className="material-symbols-outlined mt-px text-[20px] text-primary" aria-hidden>lock</span>
              Setelah klik bayar, kamu diarahkan ke halaman pembayaran Midtrans yang aman. Semua metode yang tersedia ditampilkan di sana.
            </p>
          </div>

          {error && <p className={alertError}>{error}</p>}
        </form>

        <aside className={`${card} self-start p-5 md:p-6 lg:sticky lg:top-[100px]`}>
          <h2 className="mt-0 mb-4 font-display text-lg font-semibold text-ink">Ringkasan pesanan</h2>
          <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
            {items.map((i) => (
              <li key={`${i.product_id}-${i.variant_id}`} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <strong className="font-semibold text-ink">{i.name}</strong>
                  <div className="text-xs text-muted">{i.qty} × {rp(i.price)}</div>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{rp(Number(i.price) * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-stretch gap-2">
            <input
              className={`${field} min-w-0 flex-1 font-mono uppercase`}
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Kode promo"
              aria-label="Kode promo"
            />
            <button
              type="button"
              className={btn('default', 'md', 'shrink-0')}
              onClick={() => setAppliedPromo(promoInput.trim())}
              disabled={!promoInput.trim()}
            >
              Terapkan
            </button>
          </div>
          {appliedPromo && (
            <p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
              {preview.data ? `Promo ${appliedPromo} diterapkan.` : ''}
              <button
                type="button"
                className={btn('text', 'sm')}
                onClick={() => {
                  setAppliedPromo('');
                  setPromoInput('');
                }}
              >
                Hapus
              </button>
            </p>
          )}
          {preview.isError && <p className={`${alertError} mt-3`}>{(preview.error as Error).message}</p>}

          <div className="mt-4">
            {preview.isPending && <p className="text-muted">Menghitung…</p>}
            {preview.data && <Breakdown data={preview.data} />}
          </div>

          <button
            className={btn('primary', 'xl', 'mt-5 w-full')}
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              checkout.mutate();
            }}
          >
            {checkout.isPending
              ? 'Memproses…'
              : preview.data
                ? `Bayar ${rp(preview.data.grand_total)}`
                : 'Bayar sekarang'}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <span className="material-symbols-outlined text-base text-success" aria-hidden>verified_user</span>
            Pembayaran diproses Midtrans. Pesanan dibatalkan otomatis jika tidak dibayar dalam 24 jam.
          </p>
        </aside>
      </div>
    </section>
  );
}
