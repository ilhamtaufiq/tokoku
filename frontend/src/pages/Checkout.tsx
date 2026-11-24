import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const [address, setAddress] = useState('');
  const [npwp, setNpwp] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = cart.data ?? [];
  const ready = items.length > 0 && items.every((i) => i.is_active && i.stock >= i.qty);

  const preview = useQuery({
    queryKey: ['preview', 'checkout', appliedPromo, items.map((i) => [i.product_id, i.qty])],
    queryFn: () => api.preview(items.map((i) => ({ product_id: i.product_id, qty: i.qty })), appliedPromo),
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

  if (cart.isPending) return <p className="muted">Memuat…</p>;
  if (items.length === 0) {
    return (
      <section className="empty">
        <h1>Keranjang kosong</h1>
        <Link to="/" className="btn primary">Lihat katalog</Link>
      </section>
    );
  }

  const canSubmit = ready && address.trim().length >= 10 && !checkout.isPending;

  return (
    <section>
      <h1>Checkout</h1>
      <p className="muted page-sub">Lengkapi alamat, lalu bayar lewat Xendit.</p>
      {!ready && (
        <p className="error">Ada produk yang tidak tersedia atau stoknya kurang. Kembali ke keranjang untuk menyesuaikan.</p>
      )}
      <div className="cart-grid">
        <form
          className="card form"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            checkout.mutate();
          }}
        >
          <label>
            Alamat pengiriman
            <textarea
              rows={4}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nama penerima, alamat lengkap, kota, kode pos, nomor telepon"
              required
              minLength={10}
            />
          </label>

          <label>
            NPWP pembeli <span className="muted small">(opsional, untuk faktur pajak)</span>
            <input value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="15 atau 16 digit" />
          </label>

          <div className="promo">
            <label className="grow">
              Kode promo
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Masukkan kode promo"
              />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => setAppliedPromo(promoInput.trim())}
              disabled={!promoInput.trim()}
            >
              Terapkan
            </button>
            {appliedPromo && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setAppliedPromo('');
                  setPromoInput('');
                }}
              >
                Hapus
              </button>
            )}
          </div>
          {preview.isError && <p className="error">{(preview.error as Error).message}</p>}
          {appliedPromo && preview.data && <p className="success small">Promo {appliedPromo} diterapkan.</p>}

          {error && <p className="error">{error}</p>}

          <button className="btn primary block" type="submit" disabled={!canSubmit}>
            {checkout.isPending ? 'Memproses…' : 'Bayar sekarang'}
          </button>
          <p className="muted small">Kamu akan diarahkan ke halaman pembayaran Xendit. Pesanan dibatalkan otomatis jika tidak dibayar dalam 24 jam.</p>
        </form>

        <aside className="card summary">
          <h2>Ringkasan pesanan</h2>
          {preview.isPending && <p className="muted">Menghitung…</p>}
          {preview.data && <Breakdown data={preview.data} />}
          <p className="muted small">Harga sudah termasuk PPN. Ongkos kirim tidak dikenai PPN.</p>
        </aside>
      </div>
    </section>
  );
}
