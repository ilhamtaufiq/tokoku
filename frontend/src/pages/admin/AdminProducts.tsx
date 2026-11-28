import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import type { ProductInput } from '../../api';
import { ApiError } from '../../api/client';
import type { Product } from '../../api/types';
import { rp } from '../../lib/money';
import { VariantsEditor } from './VariantsEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  BTN,
  BTN_ICON,
  CheckField,
  DemoTag,
  EMPTY_TEXT,
  FIELD,
  FILE_FIELD,
  FORM_BODY,
  FORM_TITLE,
  FormField,
  FormNotice,
  HIDE_LG,
  HINT,
  LINK_BTN,
  MONEY,
  PANEL,
  ROW,
  SECTION_RULE,
  SKU,
  StatusPill,
  TABLE_STACK,
  TD,
  TD_MONEY,
  TD_NUM,
  TH,
  TH_NUM,
} from '@/components/admin-products/ui';
import { cn } from 'cn';

const empty: ProductInput = { category_id: 0, sku: '', name: '', description: '', price: '', is_taxable: true, stock: 0, weight_grams: 1000 };

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories });
  const products = useQuery({
    queryKey: ['admin-products', search],
    queryFn: () => api.adminProducts({ q: search, per_page: 100 }),
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
        crumbs={['Portal penjual', 'Operasional bisnis', 'Produk']}
        title="Produk"
        subtitle="Kelola katalog, harga, stok, dan varian. Produk yang dinonaktifkan tidak tampil di toko."
        actions={<Button type="button" className={BTN} onClick={() => setEditing('new')}>+ Produk baru</Button>}
      />
      <Card className={cn(PANEL, 'mb-4 flex-col gap-3 p-3.5 md:flex-row md:flex-wrap md:items-center')}>
        <div className="relative w-full md:min-w-[240px] md:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sub" aria-hidden />
          <Input
            type="search"
            className="h-11 md:h-10 pl-9"
            placeholder="Cari nama atau SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari produk"
          />
        </div>
        {/* DEMO: filter status belum punya parameter API, jadi nonaktif. */}
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <div className="md:w-44">
            <select className={FIELD} disabled aria-label="Filter status (belum tersedia)" defaultValue="all">
              <option value="all">Semua status</option>
            </select>
          </div>
          <DemoTag />
        </div>
      </Card>
      {message && <div className="mb-4"><FormNotice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</FormNotice></div>}

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

      <Card className={cn(PANEL, 'mt-4 overflow-hidden')}>
        <Table className={TABLE_STACK}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={TH}>Nama</TableHead>
              <TableHead className={TH}>SKU</TableHead>
              <TableHead className={TH_NUM}>Harga</TableHead>
              <TableHead className={cn(TH, HIDE_LG, 'text-right')}>PPN</TableHead>
              <TableHead className={TH_NUM}>Stok</TableHead>
              <TableHead className={TH}>Status</TableHead>
              <TableHead className={TH} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.data?.items.map((p) => (
              <TableRow key={p.id} className={p.is_active ? '' : 'bg-surface-low/60 text-sub'}>
                <TableCell data-label="" className={cn(TD, 'max-md:block!')}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-high font-display text-sm font-bold text-sub">
                      {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : p.name.charAt(0)}
                    </span>
                    <span className="min-w-0 font-medium">{p.name}</span>
                  </div>
                </TableCell>
                <TableCell data-label="SKU" className={cn(TD, SKU)}>{p.sku}</TableCell>
                <TableCell data-label="Harga" className={TD_MONEY}>{rp(p.price)}</TableCell>
                <TableCell data-label="PPN" className={cn(TD, HIDE_LG, 'whitespace-nowrap text-right', MONEY)}>{p.is_taxable ? rp(p.ppn_included) : '—'}</TableCell>
                <TableCell data-label="Stok" className={cn(TD_NUM, MONEY)}>{p.stock}</TableCell>
                <TableCell data-label="Status" className={TD}>
                  <StatusPill tone={p.is_active ? 'ok' : 'neutral'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</StatusPill>
                </TableCell>
                <TableCell data-label="" className={cn(TD, 'whitespace-nowrap')}>
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                    <Button type="button" variant="link" className={LINK_BTN} onClick={() => setEditing(p)}>Ubah</Button>
                    {p.is_active && (
                      <Button type="button" variant="link" className={cn(LINK_BTN, 'text-destructive')} onClick={() => deactivate.mutate(p.id)}>Nonaktifkan</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {products.data?.items.length === 0 && <p className={EMPTY_TEXT}>Belum ada produk.</p>}
      </Card>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-sub">Menampilkan {products.data?.items.length ?? 0} produk</span>
        {/* DEMO: pagination belum dipakai di layar ini, jadi tombol nonaktif. */}
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="icon" className={BTN_ICON} disabled aria-label="Halaman sebelumnya">
            <ChevronLeftIcon aria-hidden />
          </Button>
          <span
            aria-current="page"
            className="inline-flex size-11 md:size-9 items-center justify-center rounded-lg border border-primary bg-primary text-sm font-semibold text-primary-foreground"
          >
            1
          </span>
          <Button type="button" variant="outline" size="icon" className={BTN_ICON} disabled aria-label="Halaman berikutnya">
            <ChevronRightIcon aria-hidden />
          </Button>
          <DemoTag className="ml-1" />
        </div>
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
    weight_grams: p.weight_grams,
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
    <Card className={PANEL}>
      <form
        className={FORM_BODY}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2 className={FORM_TITLE}>{isNew ? 'Produk baru' : 'Ubah produk'}</h2>
        <div className={ROW}>
          <FormField label="SKU">
            <Input className={FIELD} value={form.sku} onChange={(e) => set('sku', e.target.value)} required />
          </FormField>
          <FormField label="Kategori">
            <select className={FIELD} value={form.category_id} onChange={(e) => set('category_id', Number(e.target.value))} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Nama">
          <Input className={FIELD} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </FormField>
        <FormField label="Deskripsi">
          <Textarea className="min-h-24 rounded-lg border-input bg-surface px-3 py-2 text-sm text-ink dark:bg-surface" rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </FormField>
        <div className={ROW}>
          <FormField label="Harga (rupiah, termasuk PPN)">
            <Input
              className={FIELD}
              inputMode="numeric"
              value={form.price}
              onChange={(e) => set('price', e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
          </FormField>
          <FormField label="Stok">
            <Input className={FIELD} type="number" min={0} value={form.stock ?? 0} onChange={(e) => set('stock', Number(e.target.value))} />
          </FormField>
          <FormField label={<span>Berat <span className={HINT}>(gram, untuk ongkir)</span></span>}>
            <Input className={FIELD} type="number" min={1} max={100000} value={form.weight_grams ?? 1000} onChange={(e) => set('weight_grams', Number(e.target.value))} />
          </FormField>
        </div>
        <CheckField checked={form.is_taxable ?? true} onCheckedChange={(v) => set('is_taxable', v)}>Kena PPN</CheckField>
        <p className={HINT}>Harga dimasukkan sebagai harga akhir yang sudah termasuk PPN. Rincian PPN dihitung otomatis.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" className={BTN} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
          <Button type="button" variant="ghost" className={BTN} onClick={onCancel}>Batal</Button>
        </div>

        {!isNew && (
          <div className={SECTION_RULE}>
            <h2 className={FORM_TITLE}>Gambar produk</h2>
            <p className={HINT}>JPEG, PNG, atau WebP, maksimal 2 MB.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="file"
                className={FILE_FIELD}
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setImageMsg(null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className={BTN}
                disabled={!file || upload.isPending}
                onClick={() => upload.mutate()}
              >
                {upload.isPending ? 'Mengunggah…' : 'Unggah gambar'}
              </Button>
            </div>
            {imageMsg && <FormNotice kind={imageMsg.kind === 'ok' ? 'ok' : 'error'}>{imageMsg.text}</FormNotice>}
          </div>
        )}
      </form>
    </Card>
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
    <Card className={cn(PANEL)}>
      <form
        className="flex flex-col gap-4 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className={FORM_TITLE}>Kategori baru</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input className={cn(FIELD, 'sm:flex-1')} placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input className={cn(FIELD, 'sm:flex-1')} placeholder="slug (mis. elektronik)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          <Button type="submit" variant="outline" className={BTN}>Tambah</Button>
        </div>
      </form>
    </Card>
  );
}
