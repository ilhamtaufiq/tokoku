import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { rp } from '../lib/money';

const PER_PAGE = 12;

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const category = params.get('category') ?? '';
  const page = Number(params.get('page') ?? '1');

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const products = useQuery({
    queryKey: ['products', { q: params.get('q'), category, page }],
    queryFn: () =>
      api.products({
        q: params.get('q') ?? '',
        category_id: category ? Number(category) : undefined,
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

  const totalPages = Math.max(1, Math.ceil((products.data?.total ?? 0) / PER_PAGE));

  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">Belanja mudah</p>
          <h1>Temukan produk pilihanmu</h1>
          <p className="hero-sub">Harga sudah termasuk PPN, dengan rincian pajak yang transparan di setiap pesanan.</p>
        </div>
      </div>

      <div className="toolbar">
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <input
            type="search"
            placeholder="Cari nama atau SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" type="submit">Cari</button>
        </form>
        <select value={category} onChange={(e) => update({ category: e.target.value })} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {categories.data && categories.data.length > 0 && (
        <div className="chips" role="list">
          <button className={`chip ${category === '' ? 'on' : ''}`} onClick={() => update({ category: '' })}>Semua</button>
          {categories.data.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === String(c.id) ? 'on' : ''}`}
              onClick={() => update({ category: String(c.id) })}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {products.isPending && <p className="muted">Memuat produk…</p>}
      {products.isError && <p className="error">Gagal memuat produk.</p>}
      {products.data && products.data.items.length === 0 && <p className="muted">Produk tidak ditemukan.</p>}

      <div className="grid">
        {products.data?.items.map((p) => (
          <Link to={`/products/${p.id}`} key={p.id} className="card product">
            <div className="thumb" aria-hidden>{p.name.charAt(0).toUpperCase()}</div>
            <h3>{p.name}</h3>
            <p className="price">{rp(p.price)}</p>
            <p className="muted small">
              {p.is_taxable ? `Termasuk PPN ${rp(p.ppn_included)}` : 'Tidak kena PPN'}
            </p>
            {p.stock === 0 ? <span className="tag danger">Stok habis</span> : p.stock <= 5 && <span className="tag">Sisa {p.stock}</span>}
          </Link>
        ))}
      </div>

      {products.data && totalPages > 1 && (
        <nav className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            ← Sebelumnya
          </button>
          <span className="muted small">Halaman {page} dari {totalPages}</span>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
            Berikutnya →
          </button>
        </nav>
      )}
    </section>
  );
}
