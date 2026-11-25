import { Link, useLocation, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rp } from '../lib/money';
import type { Product } from '../api/types';
import { ProductImage } from './ProductImage';
import { useToast } from './Toast';

/** Kartu produk ala marketplace: gambar persegi, nama dua baris, harga, dan aksi cepat. */
export function ProductCard({ product: p }: { product: Product }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const outOfStock = p.stock === 0 || !p.is_active;
  const hasVariants = !!p.has_variants;

  const add = useMutation({
    mutationFn: async () => {
      const existing = cart.data?.find((i) => i.product_id === p.id && i.variant_id === 0)?.qty ?? 0;
      const total = Math.min(existing + 1, p.stock, 99);
      await api.setCartItem(p.id, 0, total);
      return total;
    },
    onSuccess: () => {
      toast.show(`${p.name} ditambahkan ke keranjang`);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (e) => toast.show(e instanceof ApiError ? e.message : 'Gagal menambahkan ke keranjang.', 'error'),
  });

  return (
    <article className="product">
      <Link to={`/products/${p.id}`} className="product-media" aria-label={p.name}>
        <ProductImage name={p.name} src={p.image_url} />
        {p.stock === 0 && <span className="tag danger overlay">Habis</span>}
        {p.stock > 0 && p.stock <= 5 && <span className="tag warn overlay">Sisa {p.stock}</span>}
      </Link>
      <div className="product-body">
        <Link to={`/products/${p.id}`} className="product-name">{p.name}</Link>
        <div className="price-row">
          <span className="price">{hasVariants && <span className="price-from">mulai </span>}{rp(p.price)}</span>
        </div>
        {p.is_taxable
          ? <span className="ppn-chip">Termasuk PPN</span>
          : <span className="muted small">Tidak kena PPN</span>}
        {hasVariants ? (
          <Link to={`/products/${p.id}`} className="btn outline block card-cta">
            <span className="material-symbols-outlined" aria-hidden>tune</span>
            Pilih varian
          </Link>
        ) : (
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
            {outOfStock ? 'Stok habis' : user ? 'Tambah' : 'Masuk untuk belanja'}
          </button>
        )}
      </div>
    </article>
  );
}
