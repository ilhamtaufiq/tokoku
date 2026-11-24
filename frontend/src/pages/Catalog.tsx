import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ProductCard } from '../components/ProductCard';

const PER_PAGE = 12;

const SORTS: { value: string; label: string }[] = [
  { value: '', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga terendah' },
  { value: 'price_desc', label: 'Harga tertinggi' },
  { value: 'name', label: 'Nama A–Z' },
];

const CATEGORY_ICON = ['apps', 'laptop_mac', 'mouse', 'school', 'category', 'sell'];

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? '';
  const page = Number(params.get('page') ?? '1');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const products = useQuery({
    queryKey: ['products', { q, category, sort, page }],
    queryFn: () =>
      api.products({
        q,
        category_id: category ? Number(category) : undefined,
        sort: sort || undefined,
        page,
        per_page: PER_PAGE,
      }),
  });

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const total = products.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <section>
      <div className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="material-symbols-outlined" aria-hidden>sell</span>
            Harga jujur, pajak transparan
          </span>
          <h1>Belanja perlengkapan dengan harga yang sudah termasuk PPN.</h1>
          <p className="hero-sub">
            Setiap harga sudah final. Rincian DPP dan PPN tampil jelas dari keranjang sampai invoice, dan ongkos kirim tidak dikenai PPN.
          </p>
          <div className="hero-actions">
            <a href="#katalog" className="btn primary">Belanja sekarang</a>
            <a href="#katalog" className="btn" onClick={() => update({ sort: 'price_asc' })}>Harga terendah</a>
          </div>
        </div>
        <aside className="hero-side" aria-label="Keunggulan">
          <div className="feature">
            <span className="material-symbols-outlined" aria-hidden>verified</span>
            <div><strong>Harga final</strong><p>Sudah termasuk PPN, tanpa biaya tersembunyi.</p></div>
          </div>
          <div className="feature">
            <span className="material-symbols-outlined" aria-hidden>receipt_long</span>
            <div><strong>Invoice lengkap</strong><p>Rincian DPP, PPN, dan ongkir di setiap pesanan.</p></div>
          </div>
          <div className="feature">
            <span className="material-symbols-outlined" aria-hidden>local_shipping</span>
            <div><strong>Ongkir bebas PPN</strong><p>Ongkos kirim dihitung terpisah dan tidak kena PPN.</p></div>
          </div>
        </aside>
      </div>

      {categories.data && categories.data.length > 0 && (
        <section className="block-section" aria-labelledby="kategori-title">
          <div className="section-head">
            <h2 id="kategori-title">Kategori pilihan</h2>
            <span className="muted small">Pilih kategori untuk menyaring katalog</span>
          </div>
          <div className="category-grid" role="list">
            <button
              className={`category-card ${category === '' ? 'on' : ''}`}
              onClick={() => update({ category: '' })}
            >
              <span className="material-symbols-outlined" aria-hidden>apps</span>
              <span>Semua</span>
            </button>
            {categories.data.map((c, i) => (
              <button
                key={c.id}
                className={`category-card ${category === String(c.id) ? 'on' : ''}`}
                onClick={() => update({ category: String(c.id) })}
              >
                <span className="material-symbols-outlined" aria-hidden>{CATEGORY_ICON[(i + 1) % CATEGORY_ICON.length]}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="block-section" id="katalog" aria-labelledby="katalog-title">
        <div className="section-head">
          <div>
            <h2 id="katalog-title">{q ? `Hasil untuk “${q}”` : 'Katalog produk'}</h2>
            <p className="muted small">
              {products.data ? `Menampilkan ${products.data.items.length} dari ${total} produk` : 'Memuat produk…'}
            </p>
          </div>
          <label className="sort">
            <span>Urutkan</span>
            <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Urutkan produk">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}
        {products.isError && <p className="error">Gagal memuat produk.</p>}
        {products.data && products.data.items.length === 0 && (
          <p className="muted center empty-note">Produk tidak ditemukan. Coba kata kunci lain.</p>
        )}

        <div className="grid">
          {products.data?.items.map((p) => (
            <ProductCard key={p.id} product={p} onMessage={(text, ok) => setMessage({ text, ok })} />
          ))}
        </div>

        {products.data && totalPages > 1 && (
          <nav className="pager" aria-label="Halaman">
            <button className="btn" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
              <span className="material-symbols-outlined" aria-hidden>chevron_left</span> Sebelumnya
            </button>
            <span className="muted small">Halaman {page} dari {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
              Berikutnya <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
            </button>
          </nav>
        )}
      </section>
    </section>
  );
}
