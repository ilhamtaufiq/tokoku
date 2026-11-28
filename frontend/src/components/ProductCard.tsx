import { Link, useLocation, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rp } from '../lib/money';
import type { Product } from '../api/types';
import { ProductImage } from './ProductImage';
import { useToast } from './Toast';
import { btnBase, btnOutline, card, tagBase, tagDanger, tagWarn } from './ui/storefront';
import { demoCity, demoRating } from '../data/demo';

const ctaBase = `${btnBase} mt-auto w-full text-sm max-[760px]:px-2 max-[760px]:text-xs max-[760px]:min-h-11 max-[760px]:whitespace-normal max-[760px]:leading-4 max-[760px]:py-2`;
/** Tombol sekunder (soft navy) untuk aksi tambah ke keranjang. */
const ctaSecondary =
  'border border-primary/25 bg-primary/5 text-primary hover:border-primary hover:bg-primary-container hover:text-on-primary';
/** Hover kartu: border lebih gelap dan bayangan halus, tanpa efek naik. */
const cardHover =
  'hover:border-outline hover:shadow-[0_4px_12px_-2px_rgb(0_40_142/0.06),0_2px_4px_-1px_rgb(0_0_0/0.03)]';

/** Kartu produk ala marketplace: gambar persegi, badge toko, nama, harga, stok, dan aksi cepat. */
export function ProductCard({ product: p }: { product: Product }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const outOfStock = p.stock === 0 || !p.is_active;
  const hasVariants = !!p.has_variants;
  const rating = demoRating(p.id);
  const city = demoCity(p.id);

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
      className={`${card} ${cardHover} group flex flex-col overflow-hidden p-2.5 animate-fade-up transition-[border-color,box-shadow] duration-300 ease-out min-[761px]:p-3 motion-reduce:transition-none`}
    >
      <Link
        to={`/products/${p.id}`}
        className="relative block aspect-square overflow-hidden rounded-field bg-surface-low no-underline"
        aria-label={p.name}
      >
        <ProductImage name={p.name} src={p.image_url} className="h-full w-full" />
        {p.stock === 0 && <span className={`${tagBase} ${tagDanger} absolute left-2 top-2 shadow-sm`}>Habis</span>}
        {p.stock > 0 && p.stock <= 5 && <span className={`${tagBase} ${tagWarn} absolute left-2 top-2 shadow-sm`}>Sisa {p.stock}</span>}
        {/* DEMO */}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 rounded-pill bg-surface/95 px-2 py-0.5 text-[11px] font-medium text-ink-2">
          <span className="material-symbols-outlined !text-[13px]" aria-hidden>location_on</span>
          {city}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 pt-3 max-[760px]:pt-2">
        <Link
          to={`/products/${p.id}`}
          className="line-clamp-2 min-h-11 font-body text-sm font-semibold leading-5 text-ink no-underline hover:text-primary min-[761px]:text-[15px] min-[761px]:leading-6"
        >
          {p.name}
        </Link>
        <div>
          <span className="font-mono text-[17px] font-bold leading-6 tracking-[-0.02em] tabular-nums text-primary min-[761px]:text-lg">
            {hasVariants && <span className="font-body text-xs font-normal text-muted">mulai </span>}
            {rp(p.price)}
          </span>
          {p.is_taxable
            ? <span className="block font-body text-[11px] font-medium leading-4 text-muted">Termasuk PPN 11%</span>
            : <span className="block text-[11px] leading-4 text-muted">Tidak kena PPN</span>}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* DEMO */}
          <span className="inline-flex items-center gap-1 text-ink-2">
            <span className="material-symbols-outlined !text-[14px] text-accent" aria-hidden style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="font-mono font-bold text-ink">{rating.score}</span>
            <span className="text-muted">({rating.count}+)</span>
          </span>
          <span className={`font-semibold ${p.stock === 0 || p.stock <= 5 ? 'text-error' : 'text-success'}`}>
            {p.stock === 0 ? 'Habis' : p.stock <= 5 ? `Sisa ${p.stock} unit` : 'Tersedia'}
          </span>
        </div>
        {hasVariants ? (
          <Link to={`/products/${p.id}`} className={`${ctaBase} ${btnOutline}`}>
            <span className="max-[760px]:hidden"><span className="material-symbols-outlined" aria-hidden>tune</span></span>
            Pilih varian
          </Link>
        ) : (
          <button
            className={`${ctaBase} ${ctaSecondary}`}
            disabled={outOfStock || add.isPending}
            onClick={() => {
              if (!user) {
                navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
                return;
              }
              add.mutate();
            }}
          >
            <span className="max-[760px]:hidden"><span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span></span>
            {outOfStock ? 'Stok habis' : user ? 'Tambah' : 'Masuk untuk belanja'}
          </button>
        )}
      </div>
    </article>
  );
}
