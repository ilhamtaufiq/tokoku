import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
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
      <p className="muted page-sub">Lengkapi alamat, lalu bayar dengan aman lewat Midtrans.</p>
      {!ready && (
        <p className="error">Ada produk yang tidak tersedia atau stoknya kurang. Kembali ke keranjang untuk menyesuaikan.</p>
      )}

      <div className="checkout-grid">
        <form
          className="checkout-main"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            checkout.mutate();
          }}
        >
          <div className="card section-card">
            <h2><span className="material-symbols-outlined" aria-hidden>location_on</span>Alamat pengiriman</h2>
            <p className="section-desc">Tulis alamat lengkap termasuk nama penerima dan nomor telepon.</p>
            <label>
              Alamat lengkap
              <textarea
                rows={4}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nama penerima, alamat lengkap, kota, kode pos, nomor telepon"
                required
                minLength={10}
              />
            </label>
          </div>

          <div className="card section-card">
            <h2><span className="material-symbols-outlined" aria-hidden>receipt_long</span>Faktur pajak</h2>
            <p className="section-desc">Opsional. Isi jika kamu membutuhkan faktur pajak atas nama NPWP.</p>
            <label>
              NPWP pembeli
              <input value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="15 atau 16 digit" />
            </label>
          </div>

          <div className="card section-card">
            <h2><span className="material-symbols-outlined" aria-hidden>payments</span>Metode pembayaran</h2>
            <p className="section-desc">Pilih metode setelah diarahkan ke halaman pembayaran Midtrans.</p>
            <div className="pay-methods">
              <div className="pay-method"><span className="material-symbols-outlined" aria-hidden>account_balance</span><strong>Virtual Account</strong>Transfer bank</div>
              <div className="pay-method"><span className="material-symbols-outlined" aria-hidden>qr_code_2</span><strong>QRIS</strong>Scan dari aplikasi apa pun</div>
              <div className="pay-method"><span className="material-symbols-outlined" aria-hidden>account_balance_wallet</span><strong>E-wallet</strong>Saldo dompet digital</div>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
        </form>

        <aside className="card summary">
          <h2>Ringkasan pesanan</h2>
          <ul className="order-lines">
            {items.map((i) => (
              <li key={i.product_id}>
                <div>
                  <strong>{i.name}</strong>
                  <div className="muted">{i.qty} × {rp(i.price)}</div>
                </div>
                <span>{rp(Number(i.price) * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="promo-row">
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Kode promo"
              aria-label="Kode promo"
            />
            <button type="button" className="btn" onClick={() => setAppliedPromo(promoInput.trim())} disabled={!promoInput.trim()}>
              Terapkan
            </button>
          </div>
          {appliedPromo && (
            <p className="small muted promo-state">
              {preview.data ? `Promo ${appliedPromo} diterapkan.` : ''}
              <button type="button" className="btn link small-btn" onClick={() => { setAppliedPromo(''); setPromoInput(''); }}>Hapus</button>
            </p>
          )}
          {preview.isError && <p className="error">{(preview.error as Error).message}</p>}

          <div className="summary-break">
            {preview.isPending && <p className="muted">Menghitung…</p>}
            {preview.data && <Breakdown data={preview.data} />}
          </div>

          <button
            className="btn primary block checkout-cta"
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
          <p className="guarantee">
            <span className="material-symbols-outlined" aria-hidden>verified_user</span>
            Pembayaran diproses Midtrans. Pesanan dibatalkan otomatis jika tidak dibayar dalam 24 jam.
          </p>
        </aside>
      </div>
    </section>
  );
}
