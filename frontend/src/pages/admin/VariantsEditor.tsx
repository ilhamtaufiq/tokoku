import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { Variant, VariantInput } from '../../api/types';
import { rp } from '../../lib/money';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BTN,
  BTN_SM,
  CheckField,
  FIELD,
  FormField,
  FormNotice,
  HIDE_SM,
  HINT,
  LINK_BTN,
  PANEL,
  ROW,
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
    <Card className={cn(PANEL, 'gap-4 p-4 sm:p-6')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-semibold text-ink">Varian produk</h2>
          <p className={cn(HINT, 'mt-1 max-w-xl text-[13px]')}>
            Isi jika produk punya pilihan seperti ukuran atau kapasitas. Setiap varian punya harga dan stok sendiri. Produk tanpa varian cukup diisi harga dan stok di form utama.
          </p>
        </div>
        <Button type="button" variant="outline" className={BTN_SM} onClick={() => startEdit('new')}>+ Varian</Button>
      </div>

      {message && <FormNotice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</FormNotice>}

      {variants.data && variants.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-outline-soft">
          <Table className={TABLE_STACK}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={TH}>Varian</TableHead>
                <TableHead className={cn(TH, HIDE_SM)}>SKU</TableHead>
                <TableHead className={TH_NUM}>Harga</TableHead>
                <TableHead className={TH_NUM}>Stok</TableHead>
                <TableHead className={TH}>Status</TableHead>
                <TableHead className={TH} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.data.map((v) => (
                <TableRow key={v.id} className={v.is_active ? '' : 'bg-surface-low/60 text-sub'}>
                  <TableCell data-label="" className={cn(TD, 'font-medium max-md:block!')}>{v.name}</TableCell>
                  <TableCell data-label="SKU" className={cn(TD, HIDE_SM, SKU)}>{v.sku}</TableCell>
                  <TableCell data-label="Harga" className={TD_MONEY}>{rp(v.price)}</TableCell>
                  <TableCell data-label="Stok" className={TD_NUM}>{v.stock}</TableCell>
                  <TableCell data-label="Status" className={TD}>
                    <StatusPill tone={v.is_active ? 'ok' : 'neutral'}>{v.is_active ? 'Aktif' : 'Nonaktif'}</StatusPill>
                  </TableCell>
                  <TableCell data-label="" className={cn(TD, 'whitespace-nowrap')}>
                    <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                      <Button type="button" variant="link" className={LINK_BTN} onClick={() => startEdit(v)}>Ubah</Button>
                      {v.is_active && (
                        <Button type="button" variant="link" className={cn(LINK_BTN, 'text-destructive')} onClick={() => deactivate.mutate(v.id)}>Nonaktifkan</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {variants.data && variants.data.length === 0 && <p className={HINT}>Belum ada varian.</p>}

      {editing && (
        <form
          className="flex flex-col gap-4 rounded-lg bg-surface-low p-3.5 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className={ROW}>
            <FormField label="Nama varian">
              <Input className={FIELD} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="Mis. 16GB / 512GB" />
            </FormField>
            <FormField label="SKU">
              <Input className={FIELD} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required maxLength={64} />
            </FormField>
          </div>
          <div className={ROW}>
            <FormField label="Harga (rupiah, termasuk PPN)">
              <Input className={FIELD} inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, '') })} required />
            </FormField>
            <FormField label="Stok">
              <Input className={FIELD} type="number" min={0} value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </FormField>
            <CheckField
              className="sm:flex-none sm:self-end sm:pb-2.5"
              checked={form.is_active ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            >
              Aktif
            </CheckField>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className={BTN} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan varian'}</Button>
            <Button type="button" variant="ghost" className={BTN} onClick={() => setEditing(null)}>Batal</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
