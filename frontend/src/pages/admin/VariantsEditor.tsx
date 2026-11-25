import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { Variant, VariantInput } from '../../api/types';
import { rp } from '../../lib/money';

const empty: VariantInput = { name: '', sku: '', price: '', stock: 0, is_active: true, sort_order: 0 };

/** Kelola varian sebuah produk: nama, SKU, harga, dan stok per varian. */
export function VariantsEditor({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const variants = useQuery({ queryKey: ['admin-variants', productId], queryFn: () => api.adminListVariants(productId) });
  const [editing, setEditing] = useState<Variant | 'new' | null>(null);
  const [form, setForm] = useState<VariantInput>(empty);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-variants', productId] });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
  };
  const fail = (e: unknown) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Gagal menyimpan varian.' });

  const save = useMutation({
    mutationFn: () =>
      editing && editing !== 'new'
        ? api.adminUpdateVariant(editing.id, form)
        : api.adminCreateVariant(productId, form),
    onSuccess: () => {
      setMessage({ kind: 'ok', text: 'Varian tersimpan.' });
      setEditing(null);
      setForm(empty);
      refresh();
    },
    onError: fail,
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.adminDeactivateVariant(id),
    onSuccess: () => {
      setMessage({ kind: 'ok', text: 'Varian dinonaktifkan.' });
      refresh();
    },
    onError: fail,
  });

  const startEdit = (v: Variant | 'new') => {
    setEditing(v);
    setMessage(null);
    setForm(v === 'new'
      ? { ...empty }
      : { name: v.name, sku: v.sku, price: String(Number(v.price)), stock: v.stock, is_active: v.is_active, sort_order: v.sort_order });
  };

  return (
    <div className="card form variants-editor">
      <div className="section-head pad">
        <div>
          <h2>Varian produk</h2>
          <p className="muted small">Isi jika produk punya pilihan seperti ukuran atau kapasitas. Setiap varian punya harga dan stok sendiri. Produk tanpa varian cukup diisi harga dan stok di form utama.</p>
        </div>
        <button className="btn" onClick={() => startEdit('new')}>+ Varian</button>
      </div>

      {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}

      {variants.data && variants.data.length > 0 && (
        <div className="table-wrap flat">
          <table>
            <thead>
              <tr><th>Varian</th><th>SKU</th><th>Harga</th><th>Stok</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {variants.data.map((v) => (
                <tr key={v.id} className={v.is_active ? '' : 'muted'}>
                  <td>{v.name}</td>
                  <td className="sku">{v.sku}</td>
                  <td>{rp(v.price)}</td>
                  <td>{v.stock}</td>
                  <td>{v.is_active ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="actions">
                    <button className="btn link" onClick={() => startEdit(v)}>Ubah</button>
                    {v.is_active && (
                      <button className="btn link danger" onClick={() => deactivate.mutate(v.id)}>Nonaktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {variants.data && variants.data.length === 0 && <p className="muted small">Belum ada varian.</p>}

      {editing && (
        <form
          className="variant-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="row">
            <label>
              Nama varian
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="Mis. 16GB / 512GB" />
            </label>
            <label>
              SKU
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required maxLength={64} />
            </label>
          </div>
          <div className="row">
            <label>
              Harga (rupiah, termasuk PPN)
              <input inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} required />
            </label>
            <label>
              Stok
              <input type="number" min={0} value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </label>
            <label className="check">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className="actions">
            <button className="btn primary" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan varian'}</button>
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Batal</button>
          </div>
        </form>
      )}
    </div>
  );
}
