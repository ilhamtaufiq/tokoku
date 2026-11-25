import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import type { ProductInput } from '../../api';
import { ApiError } from '../../api/client';
import type { Product } from '../../api/types';
import { rp } from '../../lib/money';
import { VariantsEditor } from './VariantsEditor';
import {
  ACTIONS,
  CHECKBOX,
  EMPTY_ROW,
  FILTER_BAR,
  FORM_CARD,
  HIDE_LG,
  HINT,
  INPUT,
  LABEL,
  LABEL_CHECK,
  Notice,
  ROW,
  SEARCH_ICON,
  SEARCH_WRAP,
  SKU,
  StatusBadge,
  TABLE,
  TABLE_WRAP,
  TBODY,
  TD,
  TD_NUM,
  TH,
  TH_NUM,
  btn,
  cx,
} from './adminUi';

const empty: ProductInput = { category_id: 0, sku: '', name: '', description: '', price: '', is_taxable: true, stock: 0 };

const FORM_TITLE = 'm-0 text-lg font-semibold text-ink';
const SECTION_RULE = 'mt-2 flex flex-col gap-3 border-t border-outline-soft pt-5';
const FILE_INPUT =
  'text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-field file:border-0 file:bg-secondary-container file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-secondary-container';

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
      <PageHeader
        title="Produk"
        subtitle="Kelola katalog, harga, stok, dan varian. Produk yang dinonaktifkan tidak tampil di toko."
        actions={<button type="button" className={btn('primary')} onClick={() => setEditing('new')}>+ Produk baru</button>}
      />
      <div className={FILTER_BAR}>
        <div className={SEARCH_WRAP}>
          <span className={SEARCH_ICON} aria-hidden>search</span>
          <input
            type="search"
            className={cx(INPUT, 'pl-10')}
            placeholder="Cari nama atau SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari produk"
          />
        </div>
      </div>
      {message && <div className="mb-4"><Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice></div>}

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

      {editing && editing !== 'new' && <div className="mt-4"><VariantsEditor productId={editing.id} /></div>}

      <div className={cx(TABLE_WRAP, 'mt-4')}>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Nama</th>
              <th className={TH}>SKU</th>
              <th className={TH_NUM}>Harga</th>
              <th className={cx(TH, HIDE_LG, 'text-right')}>PPN</th>
              <th className={TH_NUM}>Stok</th>
              <th className={TH}>Status</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody className={TBODY}>
            {products.data?.items.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'bg-surface-low/60 text-muted'}>
                <td className={TD}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-field bg-surface-high font-display text-sm font-bold text-muted">
                      {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : p.name.charAt(0)}
                    </span>
                    <span className="min-w-0 font-medium">{p.name}</span>
                  </div>
                </td>
                <td className={cx(TD, SKU)}>{p.sku}</td>
                <td className={TD_NUM}>{rp(p.price)}</td>
                <td className={cx(TD, HIDE_LG, 'whitespace-nowrap text-right tabular-nums')}>{p.is_taxable ? rp(p.ppn_included) : '—'}</td>
                <td className={TD_NUM}>{p.stock}</td>
                <td className={TD}>
                  <StatusBadge tone={p.is_active ? 'ok' : 'neutral'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                </td>
                <td className={cx(TD, 'whitespace-nowrap')}>
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                    <button type="button" className={btn('link', 'link')} onClick={() => setEditing(p)}>Ubah</button>
                    {p.is_active && (
                      <button type="button" className={btn('linkDanger', 'link')} onClick={() => deactivate.mutate(p.id)}>Nonaktifkan</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.data?.items.length === 0 && <p className={EMPTY_ROW}>Belum ada produk.</p>}
      </div>

      <div className="mt-6">
        <CategoryForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['categories'] })} onError={fail} />
      </div>
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
      className={FORM_CARD}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className={FORM_TITLE}>{isNew ? 'Produk baru' : 'Ubah produk'}</h2>
      <div className={ROW}>
        <label className={LABEL}>
          SKU
          <input className={INPUT} value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
        </label>
        <label className={LABEL}>
          Kategori
          <select className={INPUT} value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))} required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label className={LABEL}>
        Nama
        <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </label>
      <label className={LABEL}>
        Deskripsi
        <textarea className={INPUT} rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </label>
      <div className={ROW}>
        <label className={LABEL}>
          Harga (rupiah, termasuk PPN)
          <input
            className={INPUT}
            inputMode="numeric"
            value={form.price}
            onChange={(e) => set('price', e.target.value.replace(/[^0-9]/g, ''))}
            required
          />
        </label>
        <label className={LABEL}>
          Stok
          <input className={INPUT} type="number" min={0} value={form.stock ?? 0} onChange={(e) => set('stock', Number(e.target.value))} />
        </label>
      </div>
      <label className={LABEL_CHECK}>
        <input className={CHECKBOX} type="checkbox" checked={form.is_taxable ?? true} onChange={(e) => set('is_taxable', e.target.checked)} />
        Kena PPN
      </label>
      <p className={HINT}>Harga dimasukkan sebagai harga akhir yang sudah termasuk PPN. Rincian PPN dihitung otomatis.</p>
      <div className={ACTIONS}>
        <button type="submit" className={btn('primary')} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
        <button type="button" className={btn('ghost')} onClick={onCancel}>Batal</button>
      </div>

      {!isNew && (
        <div className={SECTION_RULE}>
          <h2 className={FORM_TITLE}>Gambar produk</h2>
          <p className={HINT}>JPEG, PNG, atau WebP, maksimal 2 MB.</p>
          <div className={ACTIONS}>
            <input
              type="file"
              className={FILE_INPUT}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setImageMsg(null);
              }}
            />
            <button
              type="button"
              className={btn('default')}
              disabled={!file || upload.isPending}
              onClick={() => upload.mutate()}
            >
              {upload.isPending ? 'Mengunggah…' : 'Unggah gambar'}
            </button>
          </div>
          {imageMsg && <Notice kind={imageMsg.kind === 'ok' ? 'ok' : 'error'}>{imageMsg.text}</Notice>}
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
      className={cx(FORM_CARD, 'p-4 sm:p-5')}
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2 className={FORM_TITLE}>Kategori baru</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className={cx(INPUT, 'sm:flex-1')} placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={cx(INPUT, 'sm:flex-1')} placeholder="slug (mis. elektronik)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <button type="submit" className={btn('default')}>Tambah</button>
      </div>
    </form>
  );
}
