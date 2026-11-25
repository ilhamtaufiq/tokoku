import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Breakdown } from '../components/Breakdown';
import { ProductImage } from '../components/ProductImage';
import { useToast } from '../components/Toast';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

export default function Cart() {
  useSeo({ title: 'Keranjang', noindex: true });
  const queryClient = useQueryClient();
  const toast = useToast();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const items = cart.data ?? [];
  const selected = items.filter((i) => i.selected);
  const allSelected = items.length > 0 && selected.length === items.length;
  const selectedCount = selected.reduce((n, i) => n + i.qty, 0);
  const issues = selected.filter((i) => !i.is_active || i.stock < i.qty);
  const selectable = selected.filter((i) => i.is_active && i.stock > 0);
  const checkoutReady = selected.length > 0 && issues.length === 0 && selectable.length === selected.length;

  const preview = useQuery({
    queryKey: ['preview', selectable.map((i) => [i.product_id, i.variant_id, i.qty])],
    queryFn: () => api.preview(selectable.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty }))),
    enabled: selectable.length > 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cart'] });
  const setQty = useMutation({
    mutationFn: ({ productId, variantId, qty }: { productId: number; variantId: number; qty: number }) =>
      api.setCartItem(productId, variantId, qty),
    onSuccess: refresh,
    onError: (e) => toast.show((e as Error).message, 'error'),
  });
  const remove = useMutation({
    mutationFn: ({ productId, variantId }: { productId: number; variantId: number }) => api.removeCartItem(productId, variantId),
    onSuccess: () => {
      toast.show('Barang dihapus dari keranjang');
      refresh();
    },
  });
  const toggleOne = useMutation({
    mutationFn: ({ productId, variantId, selected }: { productId: number; variantId: number; selected: boolean }) =>
      api.setCartSelected(productId, variantId, selected),
    onSuccess: refresh,
  });
  const toggleAll = useMutation({
    mutationFn: (value: boolean) => api.setAllCartSelected(value),
    onSuccess: refresh,
  });

  if (cart.isPending) {
    return (
      <div className="cart-grid" aria-hidden>
        <div className="cart-list">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="card skeleton cart-skeleton" />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="empty">
        <span className="material-symbols-outlined empty-icon" aria-hidden>shopping_cart</span>
        <h1>Keranjangmu masih kosong</h1>
        <p className="muted">Yuk, temukan perlengkapan yang kamu butuhkan.</p>
        <Link to="/" className="btn primary">Mulai belanja</Link>
      </section>
    );
  }

  const checkoutLabel = selected.length > 0 ? `Checkout (${selectedCount})` : 'Checkout';

  return (
    <section>
      <h1>Keranjang belanja</h1>
      <p className="muted page-sub">Centang barang yang ingin dibayar sekarang.</p>

      <div className="cart-grid">
        <div className="cart-main">
          <div className="card cart-head">
            <label className="check-row">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAll.mutate(e.target.checked)}
                disabled={toggleAll.isPending}
              />
              Pilih semua ({items.length})
            </label>
            <span className="muted small">{selected.length} jenis dipilih</span>
          </div>

          {issues.length > 0 && (
            <p className="error">
              Ada barang yang tidak tersedia atau stoknya kurang: {issues.map((i) => i.name).join(', ')}. Sesuaikan jumlahnya sebelum checkout.
            </p>
          )}

          <ul className="cart-list">
            {items.map((item) => {
              const unavailable = !item.is_active;
              const lowStock = !unavailable && item.stock < item.qty;
              return (
                <li key={`${item.product_id}-${item.variant_id}`} className={`card cart-item ${item.selected ? '' : 'unchecked'}`}>
                  <label className="item-check">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => toggleOne.mutate({ productId: item.product_id, variantId: item.variant_id, selected: e.target.checked })}
                      aria-label={`Pilih ${item.name}`}
                    />
                  </label>
                  <div className="cart-thumb">
                    <ProductImage name={item.name} src={item.image_url} />
                  </div>
                  <div className="grow">
                    <Link to={`/products/${item.product_id}`} className="item-name">{item.name}</Link>
                    <p className="muted small">
                      {rp(item.price)} / buah {item.is_taxable ? '· termasuk PPN' : '· tidak kena PPN'}
                    </p>
                    {unavailable && <span className="tag danger">Tidak tersedia</span>}
                    {lowStock && <span className="tag danger">Stok tersisa {item.stock}</span>}
                  </div>
                  <div className="qty">
                    <button
                      className="btn"
                      disabled={item.qty <= 1 || setQty.isPending}
                      onClick={() => setQty.mutate({ productId: item.product_id, variantId: item.variant_id, qty: item.qty - 1 })}
                      aria-label="Kurangi"
                    >−</button>
                    <span>{item.qty}</span>
                    <button
                      className="btn"
                      disabled={item.qty >= Math.min(item.stock, 99) || setQty.isPending}
                      onClick={() => setQty.mutate({ productId: item.product_id, variantId: item.variant_id, qty: item.qty + 1 })}
                      aria-label="Tambah"
                    >+</button>
                  </div>
                  <div className="line-total">{rp(Number(item.price) * item.qty)}</div>
                  <button className="btn link danger" onClick={() => remove.mutate({ productId: item.product_id, variantId: item.variant_id })}>Hapus</button>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="card summary">
          <h2>Ringkasan pesanan</h2>
          {selected.length === 0 && <p className="muted">Belum ada barang yang dipilih.</p>}
          {preview.isPending && selectable.length > 0 && <p className="muted">Menghitung…</p>}
          {preview.isError && <p className="error">{(preview.error as Error).message}</p>}
          {preview.data && selected.length > 0 && <Breakdown data={preview.data} />}
          <p className="muted small">Ongkos kirim final dihitung saat checkout dan tidak dikenai PPN.</p>
          <Link
            to="/checkout"
            className={`btn primary block checkout-cta ${checkoutReady ? '' : 'disabled'}`}
            aria-disabled={!checkoutReady}
            onClick={(e) => {
              if (!checkoutReady) e.preventDefault();
            }}
          >
            {checkoutLabel}
          </Link>
        </aside>
      </div>

      <div className="cart-bar mobile-only" role="region" aria-label="Ringkasan belanja">
        <div className="cart-bar-total">
          <span className="muted small">Total bayar</span>
          <strong>{preview.data && selected.length > 0 ? rp(preview.data.grand_total) : '—'}</strong>
        </div>
        <Link
          to="/checkout"
          className={`btn primary ${checkoutReady ? '' : 'disabled'}`}
          aria-disabled={!checkoutReady}
          onClick={(e) => {
            if (!checkoutReady) e.preventDefault();
          }}
        >
          {checkoutLabel}
        </Link>
      </div>
    </section>
  );
}
