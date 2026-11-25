import { Link, useLocation, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rp } from '../lib/money';
import type { Product } from '../api/types';
import { ProductImage } from './ProductImage';
import { useToast } from './Toast';
import { btnBase, btnOutline, btnPrimary, card, ppnChip, tagBase, tagDanger, tagWarn } from './ui/storefront';

const ctaBase = `${btnBase} mt-auto w-full text-sm max-[760px]:px-2 max-[760px]:text-xs`;

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
    <article
      className={`${card} group flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-200 ease-out hover:border-primary/45 hover:shadow-[0_6px_20px_-14px_var(--c-primary)]`}
    >
      <Link
        to={`/products/${p.id}`}
        className="relative block aspect-square bg-surface-low no-underline"
        aria-label={p.name}
      >
        <ProductImage name={p.name} src={p.image_url} className="h-full w-full rounded-none" />
        {p.stock === 0 && <span className={`${tagBase} ${tagDanger} absolute left-3 top-3 shadow-sm`}>Habis</span>}
        {p.stock > 0 && p.stock <= 5 && <span className={`${tagBase} ${tagWarn} absolute left-3 top-3 shadow-sm`}>Sisa {p.stock}</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4 max-[760px]:p-3">
        <Link
          to={`/products/${p.id}`}
          className="line-clamp-2 min-h-12 font-display text-[17px] font-semibold leading-6 text-ink no-underline hover:text-primary max-[760px]:min-h-10 max-[760px]:text-[15px] max-[760px]:leading-5"
        >
          {p.name}
        </Link>
        <div className="mt-1">
          <span className="font-display text-xl font-bold tracking-tight text-primary max-[760px]:text-base">
            {hasVariants && <span className="text-sm font-normal text-muted">mulai </span>}
            {rp(p.price)}
          </span>
        </div>
        {p.is_taxable
          ? <span className={ppnChip}>Termasuk PPN</span>
          : <span className="text-xs text-muted">Tidak kena PPN</span>}
        {hasVariants ? (
          <Link to={`/products/${p.id}`} className={`${ctaBase} ${btnOutline}`}>
            <span className="material-symbols-outlined max-[760px]:hidden" aria-hidden>tune</span>
            Pilih varian
          </Link>
        ) : (
          <button
            className={`${ctaBase} ${btnPrimary}`}
            disabled={outOfStock || add.isPending}
            onClick={() => {
              if (!user) {
                navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
                return;
              }
              add.mutate();
            }}
          >
            <span className="material-symbols-outlined max-[760px]:hidden" aria-hidden>add_shopping_cart</span>
            {outOfStock ? 'Stok habis' : user ? 'Tambah' : 'Masuk untuk belanja'}
          </button>
        )}
      </div>
    </article>
  );
}
