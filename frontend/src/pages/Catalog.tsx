import { useSearchParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ProductCard } from '../components/ProductCard';
import { BannerCarousel } from '../components/BannerCarousel';
import { useSeo } from '../lib/seo';
import { btnBase, btnDefault, chipBase, chipIdle, chipOn, emptyNote, errorBox, skeletonBlock, card } from '../components/ui/storefront';

const PER_PAGE = 12;

const SORTS: { value: string; label: string }[] = [
  { value: '', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga terendah' },
  { value: 'price_desc', label: 'Harga tertinggi' },
  { value: 'name', label: 'Nama A–Z' },
];

/** Ikon per kategori berdasarkan slug; kategori lain memakai ikon umum. */
const CATEGORY_ICON: Record<string, string> = {
  elektronik: 'devices',
  'perlengkapan-sekolah': 'school',
  aksesori: 'headphones',
};

export default function Catalog() {
  useSeo({
    description: 'Belanja laptop, mouse, tas sekolah, dan perlengkapan belajar. Harga sudah termasuk PPN dengan rincian pajak yang transparan.',
    canonicalPath: '/',
  });

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? '';

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const banners = useQuery({ queryKey: ['banners'], queryFn: api.banners });
  const products = useInfiniteQuery({
    queryKey: ['products', { q, category, sort }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.products({
        q,
        category_id: category ? Number(category) : undefined,
        sort: sort || undefined,
        page: pageParam,
        per_page: PER_PAGE,
      }),
    getNextPageParam: (last) => (last.page * last.per_page < last.total ? last.page + 1 : undefined),
  });

  const items = products.data?.pages.flatMap((pg) => pg.items) ?? [];
  const total = products.data?.pages[0]?.total ?? 0;

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const heading = q ? `Hasil untuk “${q}”` : category
    ? (categories.data?.find((c) => String(c.id) === category)?.name ?? 'Kategori')
    : 'Rekomendasi untuk kamu';

  return (
    <section className="flex flex-col">
      {banners.data && banners.data.length > 0 ? (
        <BannerCarousel banners={banners.data} />
      ) : (
        <div className="animate-fade-up mb-6 flex flex-col items-center gap-5 rounded-banner bg-primary-container px-6 py-14 text-center text-white max-[760px]:rounded-card max-[760px]:px-5 max-[760px]:py-10">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold">
            <span className="material-symbols-outlined text-base" aria-hidden>sell</span>
            Harga sudah termasuk PPN
          </span>
          <h1 className="m-0 max-w-[720px] font-display text-[40px] font-bold leading-[46px] tracking-tight text-white max-[760px]:text-[28px] max-[760px]:leading-[34px]">
            Perlengkapan sekolah & elektronik, harga sudah termasuk PPN.
          </h1>
          <p className="m-0 text-[15px] text-white/85 max-[760px]:text-sm">Ongkir tidak kena PPN. Invoice keluar untuk setiap pesanan.</p>
          <a href="#katalog" className="mt-1 inline-flex h-12 items-center rounded-pill bg-white px-7 text-sm font-bold text-primary-container no-underline transition-transform duration-150 hover:-translate-y-0.5">
            Belanja sekarang
          </a>
          <div className="flex flex-wrap justify-center gap-2" aria-label="Keunggulan">
            {[
              ['verified', 'Harga final'],
              ['receipt_long', 'Invoice lengkap'],
              ['local_shipping', 'Ongkir bebas PPN'],
            ].map(([icon, text]) => (
              <span key={text} className="flex items-center gap-2 rounded-pill bg-white/15 px-3.5 py-1.5 text-sm font-semibold">
                <span className="material-symbols-outlined text-lg" aria-hidden>{icon}</span>
                {text}
              </span>
            ))}
          </div>
        </div>
      )}

      {categories.data && categories.data.length > 0 && (
        <nav
          className="group mb-6 grid grid-cols-8 gap-2 max-[760px]:mb-4 max-[760px]:flex max-[760px]:overflow-x-auto max-[760px]:gap-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
          aria-label="Kategori"
        >
          <button
            className={`group flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-field border-0 bg-transparent px-1 py-1.5 text-center font-body text-[13px] font-semibold max-[760px]:w-[96px] max-[760px]:flex-none ${category === '' ? 'text-primary' : 'text-ink-2'}`}
            onClick={() => update({ category: '' })}
          >
            <span className={`flex h-16 w-16 items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-200 ease-out group-hover:scale-105 group-active:scale-95 max-[760px]:h-[60px] max-[760px]:w-[60px] ${category === '' ? 'border-primary bg-primary text-white' : 'border-transparent bg-surface-high text-primary group-hover:bg-secondary-container'}`}>
              <span className="material-symbols-outlined text-[26px]" aria-hidden>apps</span>
            </span>
            <span className="max-w-full truncate max-[760px]:overflow-visible max-[760px]:text-clip max-[760px]:whitespace-normal max-[760px]:break-words max-[760px]:hyphens-auto max-[760px]:text-center max-[760px]:text-[12px] max-[760px]:leading-4">Semua</span>
          </button>
          {categories.data.map((c) => {
            const on = category === String(c.id);
            return (
              <button
                key={c.id}
                className={`group flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-field border-0 bg-transparent px-1 py-1.5 text-center font-body text-[13px] font-semibold max-[760px]:w-[96px] max-[760px]:flex-none ${on ? 'text-primary' : 'text-ink-2'}`}
                onClick={() => update({ category: String(c.id) })}
              >
                <span className={`flex h-16 w-16 items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-200 ease-out group-hover:scale-105 group-active:scale-95 max-[760px]:h-[60px] max-[760px]:w-[60px] ${on ? 'border-primary bg-primary text-white' : 'border-transparent bg-surface-high text-primary group-hover:bg-secondary-container'}`}>
                  <span className="material-symbols-outlined text-[26px]" aria-hidden>{CATEGORY_ICON[c.slug] ?? 'category'}</span>
                </span>
                <span className="max-w-full truncate max-[760px]:overflow-visible max-[760px]:text-clip max-[760px]:whitespace-normal max-[760px]:break-words max-[760px]:hyphens-auto max-[760px]:text-center max-[760px]:text-[12px] max-[760px]:leading-4">{c.name}</span>
              </button>
            );
          })}
        </nav>
      )}

      <section className="mb-12" id="katalog" aria-labelledby="katalog-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 max-[760px]:items-start">
          <div>
            <h2 id="katalog-title" className="m-0 mb-1 font-display text-2xl font-semibold tracking-tight text-ink max-[760px]:text-xl">
              {heading}
            </h2>
            <p className="m-0 text-xs text-muted">
              {products.data ? `${total} produk` : 'Memuat produk…'}
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Urutkan">
          {SORTS.map((s) => {
            const on = sort === s.value;
            return (
              <button
                key={s.value}
                className={`${chipBase} cursor-pointer font-body ${on ? chipOn : chipIdle} max-[760px]:h-8 max-[760px]:px-3 max-[760px]:text-xs`}
                aria-pressed={on}
                onClick={() => update({ sort: s.value })}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {products.isError && <p className={errorBox}>Gagal memuat produk.</p>}

        {products.isPending && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 max-[760px]:grid-cols-[repeat(2,minmax(0,1fr))] max-[760px]:gap-3" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${card} flex flex-col overflow-hidden`}>
                <div className={`aspect-square ${skeletonBlock}`} />
                <div className="flex flex-col gap-2.5 p-4">
                  <div className={`h-4 w-4/5 rounded ${skeletonBlock}`} />
                  <div className={`h-4 w-2/5 rounded ${skeletonBlock}`} />
                  <div className={`mt-2 h-10 rounded-field ${skeletonBlock}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {products.data && items.length === 0 && (
          <div className={emptyNote}>
            <span className="material-symbols-outlined" aria-hidden>search_off</span>
            <p>Produk tidak ditemukan. Coba kata kunci atau kategori lain.</p>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 max-[760px]:grid-cols-[repeat(2,minmax(0,1fr))] max-[760px]:gap-3 max-[420px]:gap-2.5">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {products.hasNextPage && (
          <div className="mb-2 mt-7 flex justify-center">
            <button
              className={`${btnBase} ${btnDefault} h-11 min-w-[220px]`}
              onClick={() => products.fetchNextPage()}
              disabled={products.isFetchingNextPage}
            >
              {products.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
