import { Link, useLocation, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rp } from '../lib/money';
import type { Product } from '../api/types';
import { ProductImage } from './ProductImage';

/** Kartu produk: gambar, nama, harga termasuk PPN, dan tombol tambah ke keranjang. */
export function ProductCard({ product: p, onMessage }: { product: Product; onMessage: (text: string, ok: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const outOfStock = p.stock === 0 || !p.is_active;

  const add = useMutation({
    mutationFn: async () => {
      const existing = cart.data?.find((i) => i.product_id === p.id)?.qty ?? 0;
      const total = Math.min(existing + 1, p.stock, 99);
      await api.setCartItem(p.id, total);
      return total;
    },
    onSuccess: (total) => {
      onMessage(`${p.name} ditambahkan. Jumlah di keranjang: ${total}.`, true);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (e) => onMessage(e instanceof ApiError ? e.message : 'Gagal menambahkan ke keranjang.', false),
  });

  return (
    <article className="product">
      <Link to={`/products/${p.id}`} className="product-media" aria-label={p.name}>
        <ProductImage name={p.name} src={p.image_url} />
        {p.stock === 0 && <span className="tag danger overlay">Habis</span>}
        {p.stock > 0 && p.stock <= 5 && <span className="tag warn overlay">Stok {p.stock}</span>}
      </Link>
      <div className="product-body">
        <span className="sku">{p.sku}</span>
        <Link to={`/products/${p.id}`} className="product-name">{p.name}</Link>
        <div className="price-row">
          <span className="price">{rp(p.price)}</span>
          {p.is_taxable && <span className="ppn-chip">Termasuk PPN</span>}
        </div>
        <p className="muted small">
          {p.is_taxable ? `PPN ${rp(p.ppn_included)}` : 'Tidak kena PPN'}
        </p>
        <button
          className="btn primary block card-cta"
          disabled={outOfStock || add.isPending}
          onClick={() => {
            if (!user) {
              navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
              return;
            }
            add.mutate();
          }}
        >
          <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span>
          {outOfStock ? 'Stok habis' : user ? 'Tambah ke Keranjang' : 'Masuk untuk belanja'}
        </button>
      </div>
    </article>
  );
}
