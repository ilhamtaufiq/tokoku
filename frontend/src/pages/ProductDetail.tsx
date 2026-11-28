import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import type { Variant } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/ProductCard';
import { ProductReviews, Stars } from '../components/Reviews';
import { useToast } from '../components/Toast';
import {
  DEMO_GALLERY_EXTRA_SLOTS,
  DEMO_PRODUCT_STORE,
  DEMO_RELATED,
  DEMO_SPECS,
} from '../data/demo';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';
import { btnBase, btnDefault, btnOutline, emptyNote, errorBox, skeletonBlock } from '../components/ui/storefront';

const MAX_QTY = 99;

const qtyBtn =
  'flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface text-lg text-ink transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-45';

/** Tombol oranye pill untuk aksi beli (warna merek dari DESIGN.md, sama di mode terang dan gelap). */
const btnOrange =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-transparent bg-[#ea580c] font-body font-semibold text-white no-underline cursor-pointer select-none shadow-cta transition-colors duration-150 hover:bg-[#c2410c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none [&_.material-symbols-outlined]:!text-[20px]';

/** Dot dan kapsul status stok: hijau (aman), oranye (menipis), merah (habis). */
const stockTone = {
  ok: { pill: 'bg-success-soft text-on-success-soft', dot: 'bg-success' },
  low: { pill: 'bg-warning-soft text-on-warning-soft', dot: 'bg-accent' },
  out: { pill: 'bg-error-soft text-on-error-soft', dot: 'bg-error' },
} as const;

/** Kartu informasi kecil (pajak, toko, pengiriman) dengan ikon di kiri. */
const infoCard = 'flex flex-col gap-3 rounded-card border border-outline-soft bg-surface p-4 max-[760px]:p-3.5';
const iconCircle = 'flex size-10 shrink-0 items-center justify-center rounded-pill bg-secondary-container text-primary';

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
  const [slide, setSlide] = useState(0);
  const packageChoice = 0; // DEMO: pilihan paket pertama ditandai aktif (tampilan saja)

  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId) });
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  // Ringkasan ulasan dipakai juga oleh ProductReviews (kunci query sama, jadi tidak ada permintaan ganda).
  const summary = useQuery({ queryKey: ['reviews', productId], queryFn: () => api.reviews(productId) });
  const related = useQuery({
    queryKey: ['related', product.data?.category_id],
    queryFn: async () => {
      const page = await api.products({ category_id: product.data!.category_id, per_page: 5 });
      return page.items.filter((i) => i.id !== productId && i.is_active).slice(0, 4);
    },
    enabled: !!product.data,
  });

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
  const buyBtn = `${btnOrange} h-12 min-w-[150px] flex-1 text-[15px]`;

  // Status stok: teks tetap sama, hanya warna kapsulnya yang mengikuti kondisi.
  const stockStatus = outOfStock ? 'out' : maxStock <= 5 ? 'low' : 'ok';
  const stockText = outOfStock ? 'Stok habis' : maxStock <= 5 ? `Stok tinggal ${maxStock} unit` : `Stok tersedia ${maxStock} unit`;

  // Rincian pajak per unit: harga sudah termasuk PPN, DPP = harga / (1 + tarif).
  const unitNum = Number(unitPrice);
  const taxRate = Number(p.tax_rate);
  const dpp = Math.round(unitNum / (1 + taxRate / 100));
  const ppnAmount = unitNum - dpp;

  // Galeri: foto asli produk di slot pertama, sisanya slot dummy.
  const slides = [
    { key: 'real' as const },
    ...Array.from({ length: DEMO_GALLERY_EXTRA_SLOTS }, (_, i) => ({ key: `demo-${i}` as const })),
  ];
  const slideCount = slides.length;
  const goSlide = (n: number) => setSlide((n + slideCount) % slideCount);

  const avg = summary.data?.average ?? null;

  return (
    <section className="flex flex-col pb-24 min-[761px]:pb-0">
      <nav className="mb-4 mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted" aria-label="Breadcrumb">
        <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-muted no-underline hover:text-primary">
          <span className="material-symbols-outlined !text-[20px]" aria-hidden>arrow_back</span>Katalog
        </Link>
        <span>/</span>
        <span className="text-ink">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 min-[1001px]:grid-cols-[1.1fr_1fr] min-[1001px]:gap-12">
        {/* Galeri besar dengan badge, panah, penghitung, dan thumbnail. */}
        <div className="flex min-w-0 flex-col gap-3 min-[1001px]:sticky min-[1001px]:top-[100px]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-outline-soft bg-surface-low min-[761px]:aspect-square">
            <div className="flex h-full w-full transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {slides.map((s, idx) => (
                <div key={s.key} className="h-full w-full shrink-0" aria-hidden={idx !== slide}>
                  {s.key === 'real' ? (
                    <ProductImage name={p.name} src={p.image_url} large className="h-full w-full rounded-none" />
                  ) : (
                    /* DEMO */
                    <div className="flex h-full w-full items-center justify-center bg-surface-low">
                      <span className="material-symbols-outlined !text-[56px] text-outline" aria-hidden>image</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="absolute bottom-3 right-3 rounded-pill bg-primary/80 px-2.5 py-1 font-mono text-xs font-semibold text-on-primary tabular-nums" aria-live="polite">
              {slide + 1}/{slideCount}
            </span>
            <button
              type="button"
              className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface/90 text-ink shadow-sm"
              onClick={() => goSlide(slide - 1)}
              aria-label="Foto sebelumnya"
            >
              <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface/90 text-ink shadow-sm"
              onClick={() => goSlide(slide + 1)}
              aria-label="Foto berikutnya"
            >
              <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2" role="group" aria-label="Pilih foto produk">
            {slides.map((s, idx) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={`Foto ${idx + 1}`}
                aria-pressed={idx === slide}
                className={`flex aspect-square min-h-11 items-center justify-center overflow-hidden rounded-field border-[1.5px] bg-surface-low ${idx === slide ? 'border-primary' : 'border-outline-soft'}`}
              >
                {s.key === 'real' ? (
                  <ProductImage name={p.name} src={p.image_url} className="h-full w-full rounded-none" />
                ) : (
                  /* DEMO */
                  <span className="material-symbols-outlined text-[24px] text-outline" aria-hidden>image</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            {/* DEMO */}
            <span className="w-fit rounded-pill bg-surface-high px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-2">
              {DEMO_PRODUCT_STORE.condition}
            </span>
            <h1 className="m-0 mt-1 break-words font-display text-[26px] font-bold leading-8 tracking-[-0.4px] text-ink min-[761px]:text-[32px] min-[761px]:leading-10">
              {p.name}
            </h1>
            <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-muted">SKU {variant ? variant.sku : p.sku}</p>
          </div>

          {/* Kartu harga: harga besar font-mono, tag PPN, dan status stok. */}
          <div className="flex flex-col gap-2.5 rounded-card border border-outline-soft bg-surface px-4 py-4 min-[761px]:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[30px] font-bold leading-9 tracking-[-0.02em] tabular-nums text-primary min-[761px]:text-[36px] min-[761px]:leading-11">
                {hasVariants && !variant ? rp(p.price) : rp(unitPrice)}
              </span>
              {p.is_taxable && (
                <span className="inline-flex h-6 w-fit items-center whitespace-nowrap rounded-pill bg-success-soft px-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-on-success-soft">
                  Termasuk PPN {Number(p.tax_rate)}%
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-2">
              <Stars value={avg ?? 0} />
              <strong className="font-mono tabular-nums text-ink">{avg !== null ? avg.toFixed(1) : '—'}</strong>
              <span className="text-muted">({summary.data?.count ?? 0} ulasan)</span>
              {/* DEMO */}
              <span aria-hidden className="text-outline">•</span>
              {/* DEMO */}
              <span className="text-muted">{DEMO_PRODUCT_STORE.sold}</span>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-pill px-3 py-1 text-[13px] font-semibold ${stockTone[stockStatus].pill}`}
            >
              <span className={`size-2 rounded-full ${stockTone[stockStatus].dot}`} aria-hidden />
              {stockText}
            </span>
          </div>

          {/* Kartu rincian pajak: DPP, PPN, dan catatan ongkir. */}
          {p.is_taxable && (
            <div className={infoCard}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="m-0 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
                  <span className="material-symbols-outlined !text-[20px] text-primary" aria-hidden>account_balance</span>
                  Rincian pajak
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-field bg-surface-low p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted">DPP</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">{rp(dpp)}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-right">
                  <span className="text-xs text-muted">PPN {Number(p.tax_rate)}%</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-ink">{rp(ppnAmount)}</span>
                </div>
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-ink-2">
                <li className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined !text-[18px] text-success" aria-hidden>check_circle</span>
                  Invoice dengan rincian pajak
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined !text-[18px] text-primary" aria-hidden>local_shipping</span>
                  Ongkos kirim dihitung saat checkout, tanpa PPN
                </li>
              </ul>
            </div>
          )}
          {!p.is_taxable && (
            <p className="m-0 rounded-card border border-outline-soft bg-surface p-4 text-sm text-ink-2">Produk ini tidak kena PPN.</p>
          )}

          {hasVariants && (
            <div>
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
                      className={`relative !flex min-h-11 flex-col gap-1 rounded-field border-[1.5px] px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
                        on
                          ? 'border-primary bg-secondary-container shadow-[inset_0_0_0_1px_var(--c-primary)]'
                          : 'border-outline-soft bg-surface hover:border-primary'
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
                      <span className="font-mono text-[13px] font-semibold tabular-nums text-primary">{rp(v.price)}</span>
                      <span className="text-xs text-muted">{soldOut ? 'Habis' : `Stok ${v.stock}`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* DEMO: pilihan paket (belum ada di API). Hanya tampilan, tidak mengubah harga. */}
          <div>
            <h2 className="m-0 mb-2.5 font-display text-[15px] font-semibold text-ink">{DEMO_PRODUCT_STORE.packageLabel}</h2>
            <div className="flex flex-wrap gap-2.5" role="group" aria-label="Paket">
              {DEMO_PRODUCT_STORE.packageOptions.map((opt, idx) => (
                <span
                  key={opt}
                  className={`inline-flex min-h-11 items-center rounded-pill border-[1.5px] px-4 text-sm font-semibold ${
                    idx === packageChoice ? 'border-primary bg-primary text-on-primary' : 'border-outline-soft bg-surface text-muted'
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>

          {/* Kartu toko: nama dan lokasi toko. */}
          <div className={`${infoCard} flex-row items-center`}>
            <span className={iconCircle} aria-hidden>
              <span className="material-symbols-outlined">storefront</span>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-1.5 font-display text-[15px] font-semibold text-ink">
                {/* DEMO */}
                {DEMO_PRODUCT_STORE.name}
              </span>
              {/* DEMO */}
              <span className="text-xs text-muted">{DEMO_PRODUCT_STORE.location}</span>
            </div>
            {/* DEMO */}
            <button type="button" className={`${btnBase} ${btnOutline} h-11 shrink-0 px-4 text-[13px]`}>Kunjungi</button>
          </div>

          {/* Info pengiriman dan garansi, masing-masing dengan ikon. */}
          <ul className="m-0 flex list-none flex-col gap-3 rounded-card border border-outline-soft bg-surface p-4 text-sm text-ink-2 max-[760px]:p-3.5">
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>local_shipping</span>
              <span className="flex flex-col gap-0.5">
                {/* DEMO */}
                <strong className="font-semibold text-ink">{DEMO_PRODUCT_STORE.shipFrom}</strong>
                {/* DEMO */}
                <span className="text-xs text-muted">{DEMO_PRODUCT_STORE.shipNote}</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>verified</span>
              {/* DEMO */}
              <span className="flex flex-col gap-0.5">
                <span className="text-xs text-muted">Invoice dengan rincian pajak</span>
              </span>
            </li>
          </ul>

          {canBuy && (
            <div className="mb-2 hidden flex-wrap items-end gap-3 min-[761px]:flex">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink-2">Jumlah</span>
                <div className="inline-flex w-fit items-center gap-0.5 rounded-pill border border-outline bg-surface-low p-[3px]">
                  <button className={qtyBtn} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Kurangi">−</button>
                  <span className="min-w-[34px] text-center font-mono text-sm tabular-nums">{qty}</span>
                  <button className={qtyBtn} onClick={() => setQty((q) => Math.min(cap, q + 1))} disabled={qty >= cap} aria-label="Tambah">+</button>
                </div>
              </div>
              <button className={addBtn} disabled={add.isPending} onClick={() => (user ? add.mutate(false) : requireLogin())}>
                <span className="material-symbols-outlined !text-[20px]" aria-hidden>add_shopping_cart</span>
                {user ? 'Tambah ke keranjang' : 'Masuk untuk belanja'}
              </button>
              <button className={buyBtn} disabled={add.isPending} onClick={() => (user ? add.mutate(true) : requireLogin())}>
                Beli sekarang
              </button>
            </div>
          )}
          {hasVariants && !variant && <p className={`${errorBox}`}>Pilih varian terlebih dahulu.</p>}
          {inCart && <p className="m-0 text-xs"><Link to="/cart" className="inline-flex min-h-11 items-center font-semibold text-primary">Lihat keranjang →</Link></p>}

          {/* Deskripsi dan spesifikasi singkat dalam accordion. */}
          <details className="group rounded-card border border-outline-soft bg-surface">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-display text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined !text-[20px] text-primary" aria-hidden>description</span>
                Deskripsi &amp; spesifikasi singkat
              </span>
              <span className="material-symbols-outlined transition-transform group-open:rotate-180" aria-hidden>expand_more</span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-outline-soft px-4 py-4">
              <p className="m-0 whitespace-pre-line text-sm text-ink-2">{p.description || 'Belum ada deskripsi untuk produk ini.'}</p>
              {/* DEMO */}
              <dl className="m-0 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {DEMO_SPECS.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between gap-3 rounded-field bg-surface-low px-3 py-2.5">
                    <dt className="text-xs text-muted">{s.label}</dt>
                    <dd className="m-0 text-right text-sm font-semibold text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>

          <div className="mt-1 grid grid-cols-3 gap-3 border-t border-outline-soft pt-5 max-[760px]:gap-2">
            <div className="flex flex-col items-start gap-1.5 text-[13px] text-ink-2 max-[760px]:text-xs">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>verified</span>Harga final termasuk PPN
            </div>
            <div className="flex flex-col items-start gap-1.5 text-[13px] text-ink-2 max-[760px]:text-xs">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>receipt_long</span>Invoice dengan rincian pajak
            </div>
            <div className="flex flex-col items-start gap-1.5 text-[13px] text-ink-2 max-[760px]:text-xs">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>shield</span>Pembayaran aman via Midtrans
            </div>
          </div>
        </div>
      </div>

      {canBuy && (
        <div
          className="fixed inset-x-0 bottom-14 z-[29] hidden gap-2.5 border-t border-outline-soft bg-surface px-3.5 py-2.5 shadow-[0_-8px_20px_-16px_rgba(0,0,0,0.3)] max-[760px]:flex"
          role="region"
          aria-label="Aksi belanja"
        >
          {/* DEMO: tautan ke bantuan sebagai pengganti chat penjual (belum ada). */}
          <Link
            to="/bantuan"
            className={`${btnBase} ${btnOutline} h-12 w-12 shrink-0 p-0`}
            aria-label="Chat Penjual"
          >
            <span className="material-symbols-outlined !text-[20px]" aria-hidden>chat</span>
          </Link>
          <button
            className={`${btnBase} ${btnOutline} h-12 w-12 shrink-0 p-0`}
            disabled={add.isPending}
            onClick={() => (user ? add.mutate(false) : requireLogin())}
            aria-label="Tambah ke keranjang"
          >
            <span className="material-symbols-outlined !text-[20px]" aria-hidden>add_shopping_cart</span>
          </button>
          <button
            className={`${btnOrange} h-12 flex-1 text-[15px]`}
            disabled={add.isPending}
            onClick={() => (user ? add.mutate(true) : requireLogin())}
          >
            Beli sekarang
          </button>
        </div>
      )}

      <ProductReviews productId={productId} />

      {related.data && related.data.length > 0 && (
        /* DEMO: bagian judul dan teks pengantar (produk terkait sendiri diambil dari API). */
        <section className="mt-8 flex flex-col gap-4" aria-labelledby="related-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 id="related-title" className="m-0 font-display text-lg font-semibold text-ink">{DEMO_RELATED.title}</h2>
            </div>
            <Link to="/" className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold text-primary no-underline hover:underline">
              {DEMO_RELATED.more} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 min-[761px]:grid-cols-4 min-[761px]:gap-4">
            {related.data.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
