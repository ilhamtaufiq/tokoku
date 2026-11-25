import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import type { ProductInput } from '../../api';
import { ApiError } from '../../api/client';
import type { Product } from '../../api/types';
import { rp } from '../../lib/money';
import { VariantsEditor } from './VariantsEditor';

const empty: ProductInput = { category_id: 0, sku: '', name: '', description: '', price: '', is_taxable: true, stock: 0 };

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const products = useQuery({
    queryKey: ['admin-products', search],
    queryFn: () => api.products({ q: search, per_page: 100 }),
  });

  const fail = (e: unknown) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Terjadi kesalahan.' });
  const done = (text: string) => {
    setMessage({ kind: 'ok', text });
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const deactivate = useMutation({
    mutationFn: (id: number) => api.adminDeactivateProduct(id),
    onSuccess: () => done('Produk dinonaktifkan.'),
    onError: fail,
  });

  return (
    <section>
      <div className="toolbar">
        <h1>Produk</h1>
        <input type="search" placeholder="Cari…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn primary" onClick={() => setEditing('new')}>+ Produk baru</button>
      </div>
      {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}

      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? { ...empty, category_id: categories.data?.[0]?.id ?? 0 } : toInput(editing)}
          isNew={editing === 'new'}
          productId={editing === 'new' ? null : editing.id}
          categories={categories.data ?? []}
          onCancel={() => setEditing(null)}
          onSaved={() => done('Produk tersimpan.')}
          onError={fail}
        />
      )}

      {editing && editing !== 'new' && <VariantsEditor productId={editing.id} />}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>SKU</th><th>Nama</th><th>Harga</th><th>PPN</th><th>Stok</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {products.data?.items.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'muted'}>
                <td>{p.sku}</td>
                <td>
                  <div className="name-cell">
                    <span className="mini-thumb">{p.image_url ? <img src={p.image_url} alt="" /> : p.name.charAt(0)}</span>
                    {p.name}
                  </div>
                </td>
                <td>{rp(p.price)}</td>
                <td>{p.is_taxable ? rp(p.ppn_included) : '—'}</td>
                <td>{p.stock}</td>
                <td>{p.is_active ? 'Aktif' : 'Nonaktif'}</td>
                <td className="actions">
                  <button className="btn link" onClick={() => setEditing(p)}>Ubah</button>
                  {p.is_active && (
                    <button className="btn link danger" onClick={() => deactivate.mutate(p.id)}>Nonaktifkan</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.data?.items.length === 0 && <p className="muted center">Belum ada produk.</p>}
      </div>

      <CategoryForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['categories'] })} onError={fail} />
    </section>
  );
}

function toInput(p: Product): ProductInput {
  return {
    category_id: p.category_id,
    sku: p.sku,
    name: p.name,
    description: p.description ?? '',
    price: String(Number(p.price)),
    is_taxable: p.is_taxable,
    stock: p.stock,
  };
}

function ProductForm({
  initial,
  isNew,
  productId,
  categories,
  onCancel,
  onSaved,
  onError,
}: {
  initial: ProductInput;
  isNew: boolean;
  productId: number | null;
  categories: { id: number; name: string }[];
  onCancel: () => void;
  onSaved: () => void;
  onError: (e: unknown) => void;
}) {
  const [form, setForm] = useState<ProductInput>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [imageMsg, setImageMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: () => api.adminUploadProductImage(productId as number, file as File),
    onSuccess: () => {
      setImageMsg({ kind: 'ok', text: 'Gambar diunggah.' });
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => setImageMsg({ kind: 'error', text: e instanceof ApiError ? e.message : 'Gagal mengunggah gambar.' }),
  });
  const save = useMutation({
    mutationFn: () => (isNew ? api.adminCreateProduct(form) : api.adminUpdateProduct(productId as number, form)),
    onSuccess: onSaved,
    onError,
  });

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm({ ...form, [key]: value });

  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2>{isNew ? 'Produk baru' : 'Ubah produk'}</h2>
      <div className="row">
        <label>
          SKU
          <input value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
        </label>
        <label>
          Kategori
          <select value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label>
        Nama
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </label>
      <label>
        Deskripsi
        <textarea rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </label>
      <div className="row">
        <label>
          Harga (rupiah, termasuk PPN)
          <input
            inputMode="numeric"
            value={form.price}
            onChange={(e) => set('price', e.target.value.replace(/[^0-9]/g, ''))}
            required
          />
        </label>
        <label>
          Stok
          <input type="number" min={0} value={form.stock ?? 0} onChange={(e) => set('stock', Number(e.target.value))} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={form.is_taxable ?? true} onChange={(e) => set('is_taxable', e.target.checked)} />
        Kena PPN
      </label>
      <p className="muted small">Harga dimasukkan sebagai harga akhir yang sudah termasuk PPN. Rincian PPN dihitung otomatis.</p>
      <div className="actions">
        <button className="btn primary" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Batal</button>
      </div>

      {!isNew && (
        <div className="image-upload">
          <h2>Gambar produk</h2>
          <p className="muted small">JPEG, PNG, atau WebP, maksimal 2 MB.</p>
          <div className="actions">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setImageMsg(null);
              }}
            />
            <button
              type="button"
              className="btn"
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
            >
              {upload.isPending ? 'Mengunggah…' : 'Unggah gambar'}
            </button>
          </div>
          {imageMsg && <p className={imageMsg.kind === 'ok' ? 'success' : 'error'}>{imageMsg.text}</p>}
        </div>
      )}
    </form>
  );
}

function CategoryForm({ onCreated, onError }: { onCreated: () => void; onError: (e: unknown) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const create = useMutation({
    mutationFn: () => api.adminCreateCategory({ name: name.trim(), slug: slug.trim() }),
    onSuccess: () => {
      setName('');
      setSlug('');
      onCreated();
    },
    onError,
  });
  return (
    <form
      className="card form inline"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2>Kategori baru</h2>
      <div className="row">
        <input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="slug (mis. elektronik)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <button className="btn">Tambah</button>
      </div>
    </form>
  );
}
