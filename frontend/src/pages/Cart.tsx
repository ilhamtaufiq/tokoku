import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Breakdown } from '../components/Breakdown';
import { ProductImage } from '../components/ProductImage';
import { useToast } from '../components/Toast';
import { CartSkeleton } from '../components/FlowSkeleton';
import { alertError, btn, card, pageSub, pageTitle, tagDanger } from '../components/flowClasses';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

const checkbox = 'm-0 h-[18px] w-[18px] min-h-0 cursor-pointer p-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50';
const qtyButton =
  'flex size-8 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface text-lg leading-none text-ink hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:pointer-events-none';

export default function Cart() {
  useSeo({ title: 'Keranjang', noindex: true });
  const queryClient = useQueryClient();
  const toast = useToast();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const items = cart.data ?? [];
  const selected = items.filter((i) => i.selected);
  const allSelected = items.length > 0 && selected.length === items.length;
  const selectedCount = selected.reduce((n, i) => n + i.qty, 0);
  const issues = selected.filter((i) => !i.is_active || i.stock < i.qty);
  const selectable = selected.filter((i) => i.is_active && i.stock > 0);
  const checkoutReady = selected.length > 0 && issues.length === 0 && selectable.length === selected.length;

  const preview = useQuery({
    queryKey: ['preview', selectable.map((i) => [i.product_id, i.variant_id, i.qty])],
    queryFn: () => api.preview(selectable.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty }))),
    enabled: selectable.length > 0,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['cart'] });
  const setQty = useMutation({
    mutationFn: ({ productId, variantId, qty }: { productId: number; variantId: number; qty: number }) =>
      api.setCartItem(productId, variantId, qty),
    onSuccess: refresh,
    onError: (e) => toast.show((e as Error).message, 'error'),
  });
  const remove = useMutation({
    mutationFn: ({ productId, variantId }: { productId: number; variantId: number }) => api.removeCartItem(productId, variantId),
    onSuccess: () => {
      toast.show('Barang dihapus dari keranjang');
      refresh();
    },
  });
  const toggleOne = useMutation({
    mutationFn: ({ productId, variantId, selected }: { productId: number; variantId: number; selected: boolean }) =>
      api.setCartSelected(productId, variantId, selected),
    onSuccess: refresh,
  });
  const toggleAll = useMutation({
    mutationFn: (value: boolean) => api.setAllCartSelected(value),
    onSuccess: refresh,
  });

  if (cart.isPending) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <section className="px-4 py-16 text-center">
        <span className="material-symbols-outlined mx-auto mb-3 block text-[56px] text-outline" aria-hidden>shopping_cart</span>
        <h1 className={pageTitle}>Keranjangmu masih kosong</h1>
        <p className="mb-6 text-muted">Yuk, temukan perlengkapan yang kamu butuhkan.</p>
        <Link to="/" className={btn('primary', 'md')}>Mulai belanja</Link>
      </section>
    );
  }

  const checkoutLabel = selected.length > 0 ? `Checkout (${selectedCount})` : 'Checkout';

  return (
    <section className="pb-10 lg:pb-0">
      <h1 className={pageTitle}>Keranjang belanja</h1>
      <p className={pageSub}>Centang barang yang ingin dibayar sekarang.</p>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col">
          <div className={`${card} mb-3 flex items-center justify-between gap-3 px-4 py-3`}>
            <label className="flex cursor-pointer flex-row items-center gap-2.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                className={checkbox}
                checked={allSelected}
                onChange={(e) => toggleAll.mutate(e.target.checked)}
                disabled={toggleAll.isPending}
              />
              Pilih semua ({items.length})
            </label>
            <span className="text-xs text-muted">{selected.length} jenis dipilih</span>
          </div>

          {issues.length > 0 && (
            <p className={`${alertError} mb-3`}>
              Ada barang yang tidak tersedia atau stoknya kurang: {issues.map((i) => i.name).join(', ')}. Sesuaikan jumlahnya sebelum checkout.
            </p>
          )}

          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((item) => {
              const unavailable = !item.is_active;
              const lowStock = !unavailable && item.stock < item.qty;
              return (
                <li
                  key={`${item.product_id}-${item.variant_id}`}
                  className={`${card} flex flex-col gap-3 p-3 transition-opacity md:flex-row md:items-center md:gap-4 md:p-4 ${item.selected ? '' : 'opacity-60'}`}
                >
                  {/* Baris atas di mobile: centang, gambar, info. Di desktop wrapper ini tidak membuat kotak (md:contents). */}
                  <div className="flex min-w-0 items-center gap-3 md:contents">
                    <label className="flex shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className={checkbox}
                        checked={item.selected}
                        onChange={(e) => toggleOne.mutate({ productId: item.product_id, variantId: item.variant_id, selected: e.target.checked })}
                        aria-label={`Pilih ${item.name}`}
                      />
                    </label>
                    <div className="size-20 shrink-0 overflow-hidden rounded-field border border-outline-soft md:size-24">
                      <ProductImage name={item.name} src={item.image_url} className="h-full w-full rounded-none text-[28px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-display text-base font-semibold leading-6 text-ink no-underline hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[13px] text-muted">
                        {rp(item.price)} / buah {item.is_taxable ? '· termasuk PPN' : '· tidak kena PPN'}
                      </p>
                      {(unavailable || lowStock) && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {unavailable && <span className={tagDanger}>Tidak tersedia</span>}
                          {lowStock && <span className={tagDanger}>Stok tersisa {item.stock}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Baris bawah di mobile: jumlah, subtotal, hapus. */}
                  <div className="flex items-center gap-3 md:contents">
                    <div className="inline-flex items-center gap-0.5 rounded-pill border border-outline bg-surface-low p-0.5">
                      <button
                        className={qtyButton}
                        disabled={item.qty <= 1 || setQty.isPending}
                        onClick={() => setQty.mutate({ productId: item.product_id, variantId: item.variant_id, qty: item.qty - 1 })}
                        aria-label="Kurangi"
                      >−</button>
                      <span className="min-w-8 text-center font-mono text-sm tabular-nums">{item.qty}</span>
                      <button
                        className={qtyButton}
                        disabled={item.qty >= Math.min(item.stock, 99) || setQty.isPending}
                        onClick={() => setQty.mutate({ productId: item.product_id, variantId: item.variant_id, qty: item.qty + 1 })}
                        aria-label="Tambah"
                      >+</button>
                    </div>
                    <div className="ml-auto min-w-[104px] text-right font-display text-base font-bold tabular-nums text-ink md:min-w-[120px]">
                      {rp(Number(item.price) * item.qty)}
                    </div>
                    <button
                      className={btn('danger', 'xs')}
                      onClick={() => remove.mutate({ productId: item.product_id, variantId: item.variant_id })}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <aside className={`${card} self-start p-5 md:p-6 lg:sticky lg:top-[100px]`}>
          <h2 className="mt-0 mb-4 font-display text-lg font-semibold text-ink">Ringkasan pesanan</h2>
          {selected.length === 0 && <p className="text-muted">Belum ada barang yang dipilih.</p>}
          {preview.isPending && selectable.length > 0 && <p className="text-muted">Menghitung…</p>}
          {preview.isError && <p className={alertError}>{(preview.error as Error).message}</p>}
          {preview.data && selected.length > 0 && <Breakdown data={preview.data} />}
          <p className="mt-4 text-xs text-muted">Ongkos kirim final dihitung saat checkout dan tidak dikenai PPN.</p>
          <Link
            to="/checkout"
            className={btn('primary', 'lg', 'mt-5 w-full')}
            aria-disabled={!checkoutReady}
            onClick={(e) => {
              if (!checkoutReady) e.preventDefault();
            }}
          >
            {checkoutLabel}
          </Link>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-14 z-[29] flex items-center justify-between gap-3 border-t border-outline-soft bg-surface px-3.5 py-2.5 shadow-[0_-8px_20px_-16px_rgba(0,0,0,0.3)] md:bottom-0 lg:hidden"
        role="region"
        aria-label="Ringkasan belanja"
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">Total bayar</span>
          <strong className="font-display text-lg font-bold text-primary">
            {preview.data && selected.length > 0 ? rp(preview.data.grand_total) : '—'}
          </strong>
        </div>
        <Link
          to="/checkout"
          className={btn('primary', 'lg', 'shrink-0')}
          aria-disabled={!checkoutReady}
          onClick={(e) => {
            if (!checkoutReady) e.preventDefault();
          }}
        >
          {checkoutLabel}
        </Link>
      </div>
    </section>
  );
}
