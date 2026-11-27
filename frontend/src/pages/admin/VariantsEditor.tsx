import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { Variant, VariantInput } from '../../api/types';
import { rp } from '../../lib/money';
import {
  ACTIONS,
  CHECKBOX,
  FORM_CARD,
  HIDE_SM,
  HINT,
  INPUT,
  LABEL,
  LABEL_CHECK,
  Notice,
  ROW,
  SKU,
  StatusBadge,
  TABLE_STACK,
  TBODY,
  TD,
  TD_MONEY,
  TD_NUM,
  TH,
  TH_NUM,
  btn,
  cx,
} from './adminUi';

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
    <div className={cx(FORM_CARD, 'gap-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-semibold text-ink">Varian produk</h2>
          <p className={cx(HINT, 'mt-1 max-w-xl text-[13px]')}>
            Isi jika produk punya pilihan seperti ukuran atau kapasitas. Setiap varian punya harga dan stok sendiri. Produk tanpa varian cukup diisi harga dan stok di form utama.
          </p>
        </div>
        <button type="button" className={btn('default', 'sm')} onClick={() => startEdit('new')}>+ Varian</button>
      </div>

      {message && <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>}

      {variants.data && variants.data.length > 0 && (
        <div className="overflow-x-auto rounded-field border border-outline-soft">
          <table className={TABLE_STACK}>
            <thead>
              <tr>
                <th className={TH}>Varian</th>
                <th className={cx(TH, HIDE_SM)}>SKU</th>
                <th className={TH_NUM}>Harga</th>
                <th className={TH_NUM}>Stok</th>
                <th className={TH}>Status</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody className={TBODY}>
              {variants.data.map((v) => (
                <tr key={v.id} className={v.is_active ? '' : 'bg-surface-low/60 text-muted'}>
                  <td data-label="" className={cx(TD, 'font-medium max-md:block!')}>{v.name}</td>
                  <td data-label="SKU" className={cx(TD, HIDE_SM, SKU)}>{v.sku}</td>
                  <td data-label="Harga" className={TD_MONEY}>{rp(v.price)}</td>
                  <td data-label="Stok" className={TD_NUM}>{v.stock}</td>
                  <td data-label="Status" className={TD}>
                    <StatusBadge tone={v.is_active ? 'ok' : 'neutral'}>{v.is_active ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                  </td>
                  <td data-label="" className={cx(TD, 'whitespace-nowrap')}>
                    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                      <button type="button" className={btn('link', 'link')} onClick={() => startEdit(v)}>Ubah</button>
                      {v.is_active && (
                        <button type="button" className={btn('linkDanger', 'link')} onClick={() => deactivate.mutate(v.id)}>Nonaktifkan</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {variants.data && variants.data.length === 0 && <p className={HINT}>Belum ada varian.</p>}

      {editing && (
        <form
          className="flex flex-col gap-4 rounded-field bg-surface-low p-3.5 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className={ROW}>
            <label className={LABEL}>
              Nama varian
              <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="Mis. 16GB / 512GB" />
            </label>
            <label className={LABEL}>
              SKU
              <input className={INPUT} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required maxLength={64} />
            </label>
          </div>
          <div className={ROW}>
            <label className={LABEL}>
              Harga (rupiah, termasuk PPN)
              <input className={INPUT} inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} required />
            </label>
            <label className={LABEL}>
              Stok
              <input className={INPUT} type="number" min={0} value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </label>
            <label className={cx(LABEL_CHECK, 'sm:flex-none sm:self-end sm:pb-2.5')}>
              <input className={CHECKBOX} type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Aktif
            </label>
          </div>
          <div className={ACTIONS}>
            <button type="submit" className={btn('primary')} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan varian'}</button>
            <button type="button" className={btn('ghost')} onClick={() => setEditing(null)}>Batal</button>
          </div>
        </form>
      )}
    </div>
  );
}
