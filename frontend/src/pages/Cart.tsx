import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Breakdown } from '../components/Breakdown';
import { rp } from '../lib/money';
import { ProductImage } from '../components/ProductImage';

export default function Cart() {
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const items = cart.data ?? [];
  const active = items.filter((i) => i.is_active && i.stock > 0);
  const issues = items.filter((i) => !i.is_active || i.stock < i.qty);

  const preview = useQuery({
    queryKey: ['preview', active.map((i) => [i.product_id, i.qty])],
    queryFn: () => api.preview(active.map((i) => ({ product_id: i.product_id, qty: i.qty }))),
    enabled: active.length > 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const setQty = useMutation({
    mutationFn: ({ productId, qty }: { productId: number; qty: number }) => api.setCartItem(productId, qty),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (productId: number) => api.removeCartItem(productId),
    onSuccess: refresh,
  });

  if (cart.isPending) return <p className="muted">Memuat keranjang…</p>;

  if (items.length === 0) {
    return (
      <section className="empty">
        <h1>Keranjang kosong</h1>
        <p className="muted">Yuk, cari produk yang kamu butuhkan.</p>
        <Link to="/" className="btn primary">Lihat katalog</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Keranjang belanja</h1>
      <p className="muted page-sub">Periksa jumlah barang sebelum lanjut ke pembayaran.</p>
      {issues.length > 0 && (
        <p className="error">
          Ada produk yang tidak tersedia atau stoknya kurang: {issues.map((i) => i.name).join(', ')}. Sesuaikan jumlahnya sebelum checkout.
        </p>
      )}
      <div className="cart-grid">
        <ul className="cart-list">
          {items.map((item) => {
            const unavailable = !item.is_active;
            return (
              <li key={item.product_id} className="card cart-item">
                <div className="cart-thumb">
                  <ProductImage name={item.name} src={item.image_url} />
                </div>
                <div className="grow">
                  <Link to={`/products/${item.product_id}`}><strong>{item.name}</strong></Link>
                  <p className="muted small">
                    {rp(item.price)} / buah {item.is_taxable ? '(termasuk PPN)' : '(tidak kena PPN)'}
                  </p>
                  {unavailable && <span className="tag danger">Tidak tersedia</span>}
                  {!unavailable && item.stock < item.qty && (
                    <span className="tag danger">Stok tersisa {item.stock}</span>
                  )}
                </div>
                <div className="qty">
                  <button
                    className="btn ghost"
                    disabled={item.qty <= 1 || setQty.isPending}
                    onClick={() => setQty.mutate({ productId: item.product_id, qty: item.qty - 1 })}
                    aria-label="Kurangi"
                  >−</button>
                  <span>{item.qty}</span>
                  <button
                    className="btn ghost"
                    disabled={item.qty >= Math.min(item.stock, 99) || setQty.isPending}
                    onClick={() => setQty.mutate({ productId: item.product_id, qty: item.qty + 1 })}
                    aria-label="Tambah"
                  >+</button>
                </div>
                <div className="line-total">{rp(Number(item.price) * item.qty)}</div>
                <button className="btn link danger" onClick={() => remove.mutate(item.product_id)}>Hapus</button>
              </li>
            );
          })}
        </ul>

        <aside className="card summary">
          <h2>Ringkasan pesanan</h2>
          {preview.isPending && active.length > 0 && <p className="muted">Menghitung…</p>}
          {preview.isError && <p className="error">{(preview.error as Error).message}</p>}
          {preview.data && <Breakdown data={preview.data} />}
          <p className="muted small">Ongkos kirim final dihitung saat checkout dan tidak dikenai PPN.</p>
          <Link
            to="/checkout"
            className={`btn primary block ${active.length === 0 || issues.length > 0 ? 'disabled' : ''}`}
            aria-disabled={active.length === 0 || issues.length > 0}
            onClick={(e) => {
              if (active.length === 0 || issues.length > 0) e.preventDefault();
            }}
          >
            Lanjut ke checkout
          </Link>
        </aside>
      </div>
    </section>
  );
}
