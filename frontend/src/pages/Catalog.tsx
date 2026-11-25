import { useSearchParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ProductCard } from '../components/ProductCard';
import { useSeo } from '../lib/seo';

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
    <section>
      <div className="banner">
        <div className="banner-copy">
          <span className="eyebrow">
            <span className="material-symbols-outlined" aria-hidden>sell</span>
            Harga jujur, pajak transparan
          </span>
          <h1>Perlengkapan sekolah & elektronik, harga sudah termasuk PPN.</h1>
          <p className="hero-sub">Ongkir tidak dikenai PPN. Invoice lengkap di setiap pesanan.</p>
        </div>
        <div className="banner-trust" aria-label="Keunggulan">
          <span><span className="material-symbols-outlined" aria-hidden>verified</span>Harga final</span>
          <span><span className="material-symbols-outlined" aria-hidden>receipt_long</span>Invoice lengkap</span>
          <span><span className="material-symbols-outlined" aria-hidden>local_shipping</span>Ongkir bebas PPN</span>
        </div>
      </div>

      {categories.data && categories.data.length > 0 && (
        <nav className="category-strip" aria-label="Kategori">
          <button className={`cat-item ${category === '' ? 'on' : ''}`} onClick={() => update({ category: '' })}>
            <span className="cat-icon"><span className="material-symbols-outlined" aria-hidden>apps</span></span>
            <span>Semua</span>
          </button>
          {categories.data.map((c) => (
            <button
              key={c.id}
              className={`cat-item ${category === String(c.id) ? 'on' : ''}`}
              onClick={() => update({ category: String(c.id) })}
            >
              <span className="cat-icon">
                <span className="material-symbols-outlined" aria-hidden>{CATEGORY_ICON[c.slug] ?? 'category'}</span>
              </span>
              <span>{c.name}</span>
            </button>
          ))}
        </nav>
      )}

      <section className="block-section" id="katalog" aria-labelledby="katalog-title">
        <div className="section-head">
          <div>
            <h2 id="katalog-title">{heading}</h2>
            <p className="muted small">
              {products.data ? `${total} produk` : 'Memuat produk…'}
            </p>
          </div>
        </div>

        <div className="sort-chips" role="group" aria-label="Urutkan">
          {SORTS.map((s) => (
            <button
              key={s.value}
              className={`sort-chip ${sort === s.value ? 'on' : ''}`}
              aria-pressed={sort === s.value}
              onClick={() => update({ sort: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>

        {products.isError && <p className="error">Gagal memuat produk.</p>}

        {products.isPending && (
          <div className="grid" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="product skeleton" />)}
          </div>
        )}

        {products.data && items.length === 0 && (
          <div className="empty-note card">
            <span className="material-symbols-outlined" aria-hidden>search_off</span>
            <p>Produk tidak ditemukan. Coba kata kunci atau kategori lain.</p>
          </div>
        )}

        <div className="grid">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {products.hasNextPage && (
          <div className="load-more">
            <button className="btn" onClick={() => products.fetchNextPage()} disabled={products.isFetchingNextPage}>
              {products.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
