import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import type { Variant } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ProductImage } from '../components/ProductImage';
import { ProductReviews } from '../components/Reviews';
import { useToast } from '../components/Toast';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';
import { btnBase, btnDefault, btnOutline, btnPrimary, emptyNote, errorBox, ppnChip, skeletonBlock } from '../components/ui/storefront';

const MAX_QTY = 99;

const qtyBtn =
  'flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-pill border-0 bg-surface text-lg text-ink transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-45';

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [chosenVariant, setChosenVariant] = useState<number | null>(null);

  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId) });
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });

  const seoProduct = product.data;
  useSeo(
    seoProduct
      ? {
          title: seoProduct.name,
          description: seoProduct.description ?? `${seoProduct.name} — ${rp(seoProduct.price)}, sudah termasuk PPN.`,
          canonicalPath: `/products/${seoProduct.id}`,
          image: seoProduct.image_url ? new URL(seoProduct.image_url, window.location.origin).href : null,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: seoProduct.name,
            sku: seoProduct.sku,
            description: seoProduct.description ?? seoProduct.name,
            ...(seoProduct.image_url ? { image: new URL(seoProduct.image_url, window.location.origin).href } : {}),
            offers: {
              '@type': 'Offer',
              priceCurrency: 'IDR',
              price: Number(seoProduct.price),
              availability: seoProduct.stock > 0 && seoProduct.is_active
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              url: `${window.location.origin}/products/${seoProduct.id}`,
            },
          },
        }
      : {},
  );

  // Varian: pilihan awal = varian aktif pertama yang masih ada stok
  const variants: Variant[] = useMemo(() => product.data?.variants ?? [], [product.data]);
  const hasVariants = variants.length > 0;
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const selectedId = chosenVariant ?? firstAvailable?.id ?? 0;
  const variant = variants.find((v) => v.id === selectedId) ?? null;

  const unitPrice = variant ? variant.price : product.data?.price ?? '0';
  const maxStock = variant ? variant.stock : product.data?.stock ?? 0;
  const outOfStock = hasVariants ? !variant || variant.stock === 0 : (product.data?.stock === 0 || !product.data?.is_active);
  const cap = Math.min(maxStock, MAX_QTY);

  const add = useMutation({
    mutationFn: async (checkout: boolean) => {
      const p = product.data;
      if (!p) throw new Error('produk belum dimuat');
      const vid = variant?.id ?? 0;
      const existing = cart.data?.find((i) => i.product_id === productId && i.variant_id === vid)?.qty ?? 0;
      const total = Math.min(existing + qty, maxStock, MAX_QTY);
      await api.setCartItem(productId, vid, total);
      return { total, checkout };
    },
    onSuccess: ({ checkout }) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (checkout) {
        navigate('/checkout');
      } else {
        toast.show(`${product.data?.name ?? 'Produk'}${variant ? ` (${variant.name})` : ''} ditambahkan ke keranjang`);
      }
    },
    onError: (e) => toast.show(e instanceof ApiError ? e.message : 'Gagal menambahkan ke keranjang.', 'error'),
  });

  const requireLogin = () => {
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
  };

  if (product.isPending) {
    return (
      <div className="grid grid-cols-1 items-start gap-[18px] min-[1001px]:grid-cols-[1.1fr_1fr] min-[1001px]:gap-12" aria-hidden>
        <div className={`aspect-square ${skeletonBlock} rounded-card`} />
        <div className="flex flex-col gap-3 pt-2">
          <div className={`h-6 w-3/4 rounded ${skeletonBlock}`} />
          <div className={`h-4 w-1/2 rounded ${skeletonBlock}`} />
          <div className={`mt-4 h-10 w-1/3 rounded ${skeletonBlock}`} />
        </div>
      </div>
    );
  }
  if (product.isError || !product.data) {
    return (
      <div className={emptyNote}>
        <p>Produk tidak ditemukan.</p>
        <Link to="/" className={`${btnBase} ${btnDefault}`}>Kembali ke katalog</Link>
      </div>
    );
  }

  const p = product.data;
  const inCart = user && cart.data?.some((i) => i.product_id === productId);
  const canBuy = !outOfStock && !(hasVariants && !variant);
  const addBtn = `${btnBase} ${btnOutline} h-12 min-w-[150px] flex-1 text-[15px]`;
  const buyBtn = `${btnBase} ${btnPrimary} h-12 min-w-[150px] flex-1 text-[15px]`;

  return (
    <section className="flex flex-col">
      <nav className="mb-6 mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted" aria-label="Breadcrumb">
        <Link to="/" className="inline-flex items-center gap-1 text-muted no-underline hover:text-primary">
          <span className="material-symbols-outlined text-lg" aria-hidden>arrow_back</span>Katalog
        </Link>
        <span>/</span>
        <span className="text-ink">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-[18px] min-[1001px]:grid-cols-[1.1fr_1fr] min-[1001px]:gap-12">
        <div className="aspect-square overflow-hidden rounded-card border border-outline-soft bg-surface min-[1001px]:sticky min-[1001px]:top-[100px]">
          <ProductImage name={p.name} src={p.image_url} large className="h-full w-full rounded-none" />
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="m-0 mb-3.5 mt-2.5 font-display text-[28px] font-bold leading-9 tracking-tight text-ink max-[760px]:text-[22px] max-[760px]:leading-[30px] min-[761px]:text-[40px] min-[761px]:leading-12">
            {p.name}
          </h1>
          <p className="m-0 font-mono text-xs text-muted">SKU {variant ? variant.sku : p.sku}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3.5 rounded-card border border-outline-soft bg-surface px-5 py-4">
            <span className="font-display text-[30px] font-bold leading-10 tracking-tight text-primary min-[761px]:text-[36px] min-[761px]:leading-11">
              {hasVariants && !variant ? rp(p.price) : rp(unitPrice)}
            </span>
            {p.is_taxable && <span className={ppnChip}>Termasuk PPN {Number(p.tax_rate)}%</span>}
          </div>

          {hasVariants && (
            <div className="mb-1 mt-[18px]">
              <h2 className="m-0 mb-2.5 font-display text-[15px] font-semibold text-ink">Pilih varian</h2>
              <div
                className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]"
                role="radiogroup"
                aria-label="Varian produk"
              >
                {variants.map((v) => {
                  const soldOut = !v.is_active || v.stock === 0;
                  const on = v.id === selectedId;
                  return (
                    <label
                      key={v.id}
                      className={`relative flex flex-col gap-1 rounded-field border-[1.5px] px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
                        on
                          ? 'border-primary bg-secondary-container/40 shadow-[inset_0_0_0_1px_var(--c-primary)]'
                          : 'border-outline bg-surface hover:border-primary'
                      } ${soldOut ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name="variant"
                        value={v.id}
                        checked={on}
                        disabled={soldOut}
                        onChange={() => {
                          setChosenVariant(v.id);
                          setQty(1);
                        }}
                        className="sr-only"
                      />
                      <strong className="font-display text-sm font-semibold text-ink">{v.name}</strong>
                      <span className="text-[13px] font-semibold text-primary">{rp(v.price)}</span>
                      <span className="text-xs text-muted">{soldOut ? 'Habis' : `Stok ${v.stock}`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <ul className="m-0 mt-[18px] flex list-none flex-col gap-2.5 p-0 text-sm text-ink-2">
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-primary" aria-hidden>inventory_2</span>
              {outOfStock ? 'Stok habis' : maxStock <= 5 ? `Stok tinggal ${maxStock} unit` : `Stok tersedia ${maxStock} unit`}
            </li>
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-primary" aria-hidden>receipt_long</span>
              {p.is_taxable
                ? <>PPN {rp(Math.round(Number(unitPrice) - Number(unitPrice) / (1 + Number(p.tax_rate) / 100)))} sudah termasuk dalam harga</>
                : 'Produk ini tidak kena PPN'}
            </li>
            <li className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl text-primary" aria-hidden>local_shipping</span>
              Ongkos kirim dihitung saat checkout, tanpa PPN
            </li>
          </ul>

          {p.description && (
            <div className="mt-[22px] border-t border-outline-soft pt-[18px]">
              <h2 className="m-0 mb-1.5 font-display text-base font-semibold text-ink">Deskripsi</h2>
              <p className="m-0 whitespace-pre-line text-sm text-ink-2">{p.description}</p>
            </div>
          )}

          {canBuy && (
            <div className="mb-2 mt-5 hidden flex-wrap items-end gap-3 min-[761px]:flex">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink-2">Jumlah</span>
                <div className="inline-flex w-fit items-center gap-0.5 rounded-pill border border-outline bg-surface-low p-[3px]">
                  <button className={qtyBtn} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Kurangi">−</button>
                  <span className="min-w-[34px] text-center font-mono text-sm">{qty}</span>
                  <button className={qtyBtn} onClick={() => setQty((q) => Math.min(cap, q + 1))} disabled={qty >= cap} aria-label="Tambah">+</button>
                </div>
              </div>
              <button className={addBtn} disabled={add.isPending} onClick={() => (user ? add.mutate(false) : requireLogin())}>
                <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span>
                {user ? 'Tambah ke keranjang' : 'Masuk untuk belanja'}
              </button>
              <button className={buyBtn} disabled={add.isPending} onClick={() => (user ? add.mutate(true) : requireLogin())}>
                Beli sekarang
              </button>
            </div>
          )}
          {hasVariants && !variant && <p className={`${errorBox} mt-2`}>Pilih varian terlebih dahulu.</p>}
          {inCart && <p className="m-0 mt-2 text-xs"><Link to="/cart" className="font-semibold text-primary">Lihat keranjang →</Link></p>}

          <ul className="m-0 mt-6 grid grid-cols-3 gap-3 border-t border-outline-soft pt-5 max-[760px]:gap-2">
            <li className="flex flex-col items-start gap-1.5 text-[13px] text-ink-2 max-[760px]:text-xs">
              <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden>verified</span>Harga final termasuk PPN
            </li>
            <li className="flex flex-col items-start gap-1.5 text-[13px] text-ink-2 max-[760px]:text-xs">
              <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden>receipt_long</span>Invoice dengan rincian pajak
            </li>
            <li className="flex flex-col items-start gap-1.5 text-[13px] text-ink-2 max-[760px]:text-xs">
              <span className="material-symbols-outlined text-[22px] text-primary" aria-hidden>shield</span>Pembayaran aman via Midtrans
            </li>
          </ul>
        </div>
      </div>

      {canBuy && (
        <div
          className="fixed inset-x-0 bottom-14 z-[29] hidden gap-2.5 border-t border-outline-soft bg-surface px-3.5 py-2.5 shadow-[0_-8px_20px_-16px_rgba(0,0,0,0.3)] max-[760px]:flex"
          role="region"
          aria-label="Aksi belanja"
        >
          <button
            className={`${btnBase} ${btnOutline} h-[46px] w-[52px] p-0`}
            disabled={add.isPending}
            onClick={() => (user ? add.mutate(false) : requireLogin())}
            aria-label="Tambah ke keranjang"
          >
            <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span>
          </button>
          <button
            className={`${btnBase} ${btnPrimary} h-[46px] flex-1 text-[15px]`}
            disabled={add.isPending}
            onClick={() => (user ? add.mutate(true) : requireLogin())}
          >
            Beli sekarang
          </button>
        </div>
      )}

      <ProductReviews productId={productId} />
    </section>
  );
}
