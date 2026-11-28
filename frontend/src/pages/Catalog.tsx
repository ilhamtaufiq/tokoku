import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { Product } from '../api/types';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { BannerCarousel } from '../components/BannerCarousel';
import { useSeo } from '../lib/seo';
import { rp } from '../lib/money';
import { btnBase, btnDefault, btnPrimary, emptyNote, errorBox, skeletonBlock, card } from '../components/ui/storefront';
import {
  DEMO_B2B_POINTS,
  DEMO_CURATION_TABS,
  DEMO_FLASH_DISCOUNTS,
  DEMO_FLASH_SALE_ENDS_IN,
  DEMO_FLASH_SOLD_PCT,
  DEMO_HERO,
  DEMO_SHIP_TO,
  DEMO_STORE_LABEL,
  DEMO_TRUST_BADGES,
  DEMO_USPS,
} from '../data/demo';

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

/** Grid kartu: 2 kolom di mobile, 4 di tablet, 6 di desktop (sesuai Stitch). */
const PRODUCT_GRID =
  'grid grid-cols-2 gap-3 max-[420px]:gap-2.5 min-[761px]:grid-cols-4 min-[761px]:gap-5 min-[1101px]:grid-cols-6 min-[1101px]:gap-4';

/** Lingkaran kategori: 64px di mobile, 80px di desktop, dengan ring 1px. */
const circleBase =
  'flex h-20 w-20 items-center justify-center rounded-full border transition-[transform,background-color,border-color] duration-200 ease-out group-hover:scale-105 group-active:scale-95 max-[760px]:h-16 max-[760px]:w-16';

const pad = (n: number) => String(n).padStart(2, '0');

/** Hitung mundur flash sale dummy (berhenti di 00:00:00). */
function useFlashCountdown() {
  const start =
    DEMO_FLASH_SALE_ENDS_IN.hours * 3600 + DEMO_FLASH_SALE_ENDS_IN.minutes * 60 + DEMO_FLASH_SALE_ENDS_IN.seconds;
  const [left, setLeft] = useState(start);
  useEffect(() => {
    const t = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, []);
  return [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60];
}

export default function Catalog() {
  useSeo({
    description: 'Belanja laptop, mouse, tas sekolah, dan perlengkapan belajar. Harga sudah termasuk PPN dengan rincian pajak yang transparan.',
    canonicalPath: '/',
  });

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? '';
  const [hh, mm, ss] = useFlashCountdown();

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const banners = useQuery({ queryKey: ['banners'], queryFn: api.banners });
  const flash = useQuery({
    queryKey: ['products', 'flash'],
    queryFn: () => api.products({ sort: 'price_desc', per_page: 4 }),
  });
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
  const flashItems = flash.data?.items ?? [];

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
      {/* DEMO: alamat pengiriman (hanya mobile) */}
      <div className="mb-4 flex items-center gap-2 rounded-pill bg-surface-low px-4 py-2.5 text-xs text-ink-2 min-[761px]:hidden">
        <span className="material-symbols-outlined text-base text-primary" aria-hidden>location_on</span>
        <span className="min-w-0 truncate">Kirim ke: <strong className="font-semibold text-ink">{DEMO_SHIP_TO}</strong></span>
      </div>

      {/* HERO: teks kiri, promo kanan */}
      <section className="mb-10 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch" aria-label="Promo utama">
        <div className="flex flex-col justify-between gap-6 rounded-banner bg-surface-low p-6 min-[761px]:p-8 lg:col-span-7 lg:p-10">
          <div className="flex flex-col gap-4">
            {/* DEMO */}
            <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-secondary-container px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-on-secondary-container">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {DEMO_HERO.eyebrow}
            </span>
            <h1 className="m-0 max-w-xl font-display text-[30px] font-bold leading-[38px] tracking-tight text-primary min-[761px]:text-[40px] min-[761px]:leading-[46px]">
              {DEMO_HERO.title}
            </h1>
            {/* DEMO */}
            <p className="m-0 max-w-xl text-[15px] leading-6 text-ink-2 max-[760px]:hidden">{DEMO_HERO.body}</p>
          </div>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-3">
              <a href="#katalog" className={`${btnBase} ${btnPrimary} px-6`}>
                Belanja sekarang
                <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
              </a>
              {/* DEMO */}
              <Link to="/bantuan" className={`${btnBase} ${btnDefault} bg-surface px-6`}>
                <span className="material-symbols-outlined text-accent" aria-hidden>account_balance</span>
                Pengadaan Sekolah (B2B)
              </Link>
            </div>
            {/* DEMO */}
            <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-xs font-semibold text-ink-2 max-[760px]:hidden">
              {DEMO_TRUST_BADGES.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-success" aria-hidden>check_circle</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 max-[760px]:order-first lg:col-span-5">
          {banners.data && banners.data.length > 0 ? (
            <BannerCarousel banners={banners.data} compact />
          ) : (
            <div className="animate-fade-up flex flex-col items-start justify-center gap-3 rounded-banner bg-primary-container px-6 py-8 text-white max-[760px]:rounded-card min-[761px]:px-8 lg:h-[240px]">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold">
                <span className="material-symbols-outlined text-base" aria-hidden>sell</span>
                Harga sudah termasuk PPN
              </span>
              <p className="m-0 font-display text-2xl font-bold leading-8 tracking-tight text-white">
                Perlengkapan sekolah &amp; elektronik, harga final.
              </p>
              <p className="m-0 text-sm text-white/85">Ongkir tidak kena PPN. Invoice keluar untuk setiap pesanan.</p>
            </div>
          )}
          {/* DEMO: kartu promo kedua dengan badge */}
          <div className="flex items-center justify-between gap-4 rounded-banner border border-outline-soft bg-surface p-4 shadow-card min-[761px]:p-5">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="w-fit rounded-pill bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent">Stok Baru</span>
              <span className="font-display text-lg font-bold leading-6 text-ink">{DEMO_HERO.promoTitle}</span>
              <span className="font-mono text-sm font-bold text-accent">{DEMO_HERO.promoPrice}</span>
            </div>
            <a
              href="#katalog"
              aria-label="Lihat promo"
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-pill bg-primary text-on-primary no-underline transition-transform duration-150 hover:scale-105"
            >
              <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
            </a>
          </div>
        </div>
      </section>

      {/* USP: 4 kartu keunggulan */}
      <section aria-label="Keunggulan" className={`${card} mb-10 grid grid-cols-2 gap-4 p-4 shadow-card min-[761px]:grid-cols-4 min-[761px]:p-5`}>
        {/* DEMO */}
        {DEMO_USPS.map((u) => (
          <div key={u.title} className="flex items-start gap-3">
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-field bg-surface-low ${u.tone}`}>
              <span className="material-symbols-outlined text-2xl" aria-hidden>{u.icon}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-bold leading-tight text-ink">{u.title}</span>
              <span className="text-xs leading-4 text-muted">{u.body}</span>
            </span>
          </div>
        ))}
      </section>

      {/* KATEGORI POPULER */}
      <section className="mb-10" aria-labelledby="kategori-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="kategori-title" className="m-0 font-display text-xl font-bold tracking-tight text-ink">Kategori Populer</h2>
            {/* DEMO */}
            <p className="m-0 mt-1 text-xs text-muted">Pilihan perlengkapan dan kurikulum terverifikasi</p>
          </div>
          <a href="#katalog" className="inline-flex h-11 flex-none items-center gap-1 text-sm font-bold text-primary no-underline hover:text-accent">
            Lihat semua kategori
            <span className="material-symbols-outlined text-base" aria-hidden>arrow_forward</span>
          </a>
        </div>
        {categories.data && categories.data.length > 0 && (
          <nav
            className="group grid grid-cols-4 gap-2 md:grid-cols-8 max-[760px]:flex max-[760px]:overflow-x-auto max-[760px]:gap-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            aria-label="Kategori"
          >
            <button
              className={`group flex min-w-0 cursor-pointer flex-col items-center gap-2.5 rounded-field border-0 bg-transparent px-1 py-1 text-center font-body text-xs font-semibold max-[760px]:w-[92px] max-[760px]:flex-none ${category === '' ? 'text-primary' : 'text-ink-2'}`}
              onClick={() => update({ category: '' })}
            >
              <span className={`${circleBase} ${category === '' ? 'border-primary bg-primary text-on-primary' : 'border-outline-soft bg-surface text-primary group-hover:border-primary'}`}>
                <span className="material-symbols-outlined !text-[28px]" aria-hidden>apps</span>
              </span>
              <span className="max-w-full truncate max-[760px]:overflow-visible max-[760px]:text-clip max-[760px]:whitespace-normal max-[760px]:break-normal max-[760px]:text-center max-[760px]:leading-4">Semua</span>
            </button>
            {categories.data.map((c) => {
              const on = category === String(c.id);
              return (
                <button
                  key={c.id}
                  className={`group flex min-w-0 cursor-pointer flex-col items-center gap-2.5 rounded-field border-0 bg-transparent px-1 py-1 text-center font-body text-xs font-semibold max-[760px]:w-[92px] max-[760px]:flex-none ${on ? 'text-primary' : 'text-ink-2'}`}
                  onClick={() => update({ category: String(c.id) })}
                >
                  <span className={`${circleBase} ${on ? 'border-primary bg-primary text-on-primary' : 'border-outline-soft bg-surface text-primary group-hover:border-primary'}`}>
                    <span className="material-symbols-outlined !text-[28px]" aria-hidden>{CATEGORY_ICON[c.slug] ?? 'category'}</span>
                  </span>
                  <span className="max-w-full truncate max-[760px]:overflow-visible max-[760px]:text-clip max-[760px]:whitespace-normal max-[760px]:break-normal max-[760px]:text-center max-[760px]:leading-4">{c.name}</span>
                </button>
              );
            })}
          </nav>
        )}
      </section>

      {/* FLASH SALE */}
      <section className="mb-10 rounded-banner bg-surface-low p-5 min-[761px]:p-6" aria-labelledby="flash-title">
        <div className="mb-5 flex flex-col gap-4 min-[761px]:flex-row min-[761px]:items-center min-[761px]:justify-between">
          <div className="flex items-start gap-3">
            {/* DEMO */}
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-pill bg-accent text-white">
              <span className="material-symbols-outlined" aria-hidden>bolt</span>
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="flash-title" className="m-0 font-display text-xl font-bold tracking-tight text-ink">Flash Sale PPN Disubsidi</h2>
                {/* DEMO */}
                <span className="rounded-pill bg-accent px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">PPN 0% Subsidi</span>
              </div>
              {/* DEMO */}
              <p className="m-0 text-xs text-muted">Harga netto terbit faktur pajak resmi khusus transaksi instan hari ini</p>
            </div>
          </div>
          {/* DEMO: timer */}
          <div className="flex items-center gap-2 self-start rounded-field bg-surface px-3 py-2 shadow-card min-[761px]:self-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Berakhir dalam</span>
            <span className="flex items-center gap-1 font-mono text-sm font-bold text-accent" aria-live="off">
              {[hh, mm, ss].map((v, i) => (
                <Fragment key={i}>
                  {i > 0 && <span aria-hidden>:</span>}
                  <span className="rounded bg-surface-high px-1.5 py-0.5 tabular-nums">{pad(v)}</span>
                </Fragment>
              ))}
            </span>
          </div>
        </div>

        {flash.isPending && <p className="m-0 text-sm text-muted">Memuat flash sale…</p>}
        {!flash.isPending && flashItems.length === 0 && (
          <p className="m-0 text-sm text-muted">Produk flash sale belum tersedia.</p>
        )}
        {flashItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 min-[761px]:grid-cols-4 min-[761px]:gap-4">
            {flashItems.slice(0, 4).map((p, i) => (
              <FlashCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* KATALOG */}
      <section className="mb-12" id="katalog" aria-labelledby="katalog-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 max-[760px]:items-start">
          <div>
            <h2 id="katalog-title" className="m-0 mb-1 font-display text-2xl font-semibold tracking-tight text-ink max-[760px]:text-xl">
              {heading}
            </h2>
            <p className="m-0 text-xs text-muted">
              {products.data ? `${total} produk` : 'Memuat produk…'}
            </p>
          </div>
          {/* DEMO */}
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-success-soft px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-on-success-soft">
            <span className="material-symbols-outlined !text-[14px]" aria-hidden>verified</span>
            Terverifikasi SIPLah
          </span>
        </div>

        {/* Bar filter: kurasi (demo) dan urutan (fungsional) */}
        <div className="mb-5 flex flex-col gap-3 rounded-banner border border-outline-soft bg-surface p-3 shadow-card min-[1101px]:flex-row min-[1101px]:items-center min-[1101px]:justify-between">
          {/* DEMO */}
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Kurasi produk">
            <button type="button" disabled className="inline-flex h-11 flex-none items-center rounded-pill bg-primary px-4 text-sm font-semibold text-on-primary">
              Semua Produk
            </button>
            {DEMO_CURATION_TABS.map((t) => (
              <button
                key={t}
                type="button"
                disabled
                className="inline-flex h-11 flex-none items-center rounded-pill border border-outline-soft bg-surface-low px-4 text-sm font-medium text-ink-2"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Urutkan">
            {SORTS.map((s) => {
              const on = sort === s.value;
              return (
                <button
                  key={s.value}
                  className={`inline-flex h-11 flex-none cursor-pointer items-center rounded-pill border px-4 font-body text-[13px] font-semibold transition-colors duration-150 ${
                    on
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-soft bg-surface text-ink-2 hover:border-primary hover:text-primary'
                  }`}
                  aria-pressed={on}
                  onClick={() => update({ sort: s.value })}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {products.isError && <p className={errorBox}>Gagal memuat produk.</p>}

        {products.isPending && (
          <div className={PRODUCT_GRID} aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${card} flex flex-col overflow-hidden p-3`}>
                <div className={`aspect-square rounded-field ${skeletonBlock}`} />
                <div className="flex flex-col gap-2.5 pt-3">
                  <div className={`h-4 w-4/5 rounded ${skeletonBlock}`} />
                  <div className={`h-4 w-2/5 rounded ${skeletonBlock}`} />
                  <div className={`mt-2 h-11 rounded-pill ${skeletonBlock}`} />
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

        <div className={PRODUCT_GRID}>
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {products.hasNextPage && (
          <div className="mb-2 mt-8 flex justify-center">
            <button
              className={`${btnBase} ${btnDefault} h-11 min-w-[220px] bg-surface`}
              onClick={() => products.fetchNextPage()}
              disabled={products.isFetchingNextPage}
            >
              {products.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </section>

      {/* CTA DAFTAR PENJUAL / SEKOLAH */}
      <section className="relative mb-4 overflow-hidden rounded-banner bg-primary p-6 text-on-primary min-[761px]:p-10" aria-labelledby="b2b-title">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* DEMO */}
            <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-white/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white">
              <span className="material-symbols-outlined !text-[14px]" aria-hidden>integration_instructions</span>
              Ekosistem Pendidikan Digital Terpadu
            </span>
            <h2 id="b2b-title" className="m-0 font-display text-2xl font-bold leading-tight text-white min-[761px]:text-[32px] min-[761px]:leading-[40px]">
              Daftarkan Sekolah atau Toko Anda di Tokoku
            </h2>
            {/* DEMO */}
            <p className="m-0 max-w-2xl text-[15px] leading-6 text-white/85">
              Bergabung bersama ribuan institusi pendidikan negeri dan swasta. Dapatkan akses katalog SiPLAh, faktur pajak otomatis, verifikasi BAST digital, dan penagihan terpusat.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/jual" className={`${btnBase} bg-accent px-6 font-bold text-white hover:brightness-110`}>
                <span className="material-symbols-outlined" aria-hidden>storefront</span>
                Buka Toko Gratis
              </Link>
              {/* DEMO */}
              <Link to="/bantuan" className={`${btnBase} border border-white/25 bg-white/10 px-6 font-bold text-white hover:bg-white/20`}>
                <span className="material-symbols-outlined" aria-hidden>receipt</span>
                Panduan Integrasi e-Faktur
              </Link>
            </div>
          </div>
          {/* DEMO */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            {DEMO_B2B_POINTS.map((pt) => (
              <div key={pt.title} className="rounded-field border border-white/15 bg-white/10 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="material-symbols-outlined text-lg" aria-hidden>{pt.icon}</span>
                  {pt.title}
                </div>
                <p className="m-0 mt-1.5 text-xs leading-5 text-white/75">{pt.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

/** Kartu flash sale: produk asli dari API, diskon dan progress stok dummy. */
function FlashCard({ product: p, index }: { product: Product; index: number }) {
  const discount = DEMO_FLASH_DISCOUNTS[index % DEMO_FLASH_DISCOUNTS.length];
  const sold = DEMO_FLASH_SOLD_PCT[index % DEMO_FLASH_SOLD_PCT.length];
  /* DEMO: harga coret dihitung dari diskon dummy */
  const original = Math.round(Number(p.price) / (1 - discount / 100) / 1000) * 1000;

  return (
    <article className={`${card} flex flex-col overflow-hidden p-2.5 shadow-card min-[761px]:p-3`}>
      <Link
        to={`/products/${p.id}`}
        className="relative block aspect-square overflow-hidden rounded-field bg-surface-low no-underline"
        aria-label={p.name}
      >
        <ProductImage name={p.name} src={p.image_url} className="h-full w-full" />
        {/* DEMO */}
        <span className="absolute left-2 top-2 rounded-pill bg-accent px-2 py-0.5 font-mono text-[11px] font-bold text-white">-{discount}%</span>
        {/* DEMO */}
        <span className="absolute bottom-2 left-2 rounded-field bg-surface/95 px-1.5 py-0.5 font-mono text-[10px] font-bold text-success">
          {DEMO_STORE_LABEL} • PKP
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 pt-3">
        <Link
          to={`/products/${p.id}`}
          className="line-clamp-2 min-h-11 text-sm font-semibold leading-5 text-ink no-underline hover:text-primary"
        >
          {p.name}
        </Link>
        <div className="flex flex-col">
          <span className="font-mono text-base font-bold leading-6 tabular-nums text-accent">{rp(p.price)}</span>
          {/* DEMO */}
          <span className="font-mono text-xs text-muted line-through tabular-nums">{rp(original)}</span>
        </div>
        <span className="text-[11px] font-medium text-success">{p.is_taxable ? 'Sudah termasuk PPN 11%' : 'Tidak kena PPN'}</span>
        <div className="mt-auto space-y-1 pt-2">
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="font-semibold text-ink-2">{p.stock > 0 ? `Tersisa ${p.stock} unit` : 'Habis'}</span>
            {/* DEMO */}
            <span className="font-mono text-muted">Terjual {sold}%</span>
          </div>
          {/* DEMO: progress stok */}
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-high">
            <div className="h-full rounded-pill bg-accent" style={{ width: `${sold}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}
