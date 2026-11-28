import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { CartItem } from '../api/types';
import { Breakdown } from '../components/Breakdown';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { useToast } from '../components/Toast';
import { CartSkeleton } from '../components/FlowSkeleton';
import { alertError, btn, card, pageSub, pageTitle, tagDanger } from '../components/flowClasses';
import {
  DEMO_CART_BANNER,
  DEMO_CART_COUPON_NOTE,
  DEMO_CART_ESCROW,
  DEMO_COMPLIANCE_BANNER,
  DEMO_HELP_CARD,
  DEMO_RELATED,
  DEMO_SPH,
  DEMO_STORE_TAGS,
  demoStoreLocation,
} from '../data/demo';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Kotak centang kecil; area sentuhnya 44px lewat label pembungkus. */
const checkbox = 'm-0 !h-[18px] !w-[18px] min-h-0 !flex-none cursor-pointer p-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50';
const touchLabel = '!flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center';
const qtyButton =
  'flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-surface text-lg leading-none text-ink hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:pointer-events-none';

/** Tombol oranye pill untuk checkout (warna merek dari DESIGN.md, sama di mode terang dan gelap). */
const btnOrange =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-transparent bg-[#ea580c] font-body font-semibold text-white no-underline cursor-pointer select-none shadow-cta transition-colors duration-150 hover:bg-[#c2410c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none [&_.material-symbols-outlined]:!text-[20px]';

type StoreGroup = { storeId: number; storeName: string; items: CartItem[] };

export default function Cart() {
  useSeo({ title: 'Keranjang', noindex: true });
  const queryClient = useQueryClient();
  const toast = useToast();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const items = cart.data ?? [];
  const selected = items.filter((i) => i.selected);
  const allSelected = items.length > 0 && selected.length === items.length;
  const selectedCount = selected.reduce((n, i) => n + i.qty, 0);
  const selectedStores = new Set(selected.map((i) => i.store_id)).size;
  const issues = selected.filter((i) => !i.is_active || i.stock < i.qty);
  const selectable = selected.filter((i) => i.is_active && i.stock > 0);
  const checkoutReady = selected.length > 0 && issues.length === 0 && selectable.length === selected.length;

  const preview = useQuery({
    queryKey: ['preview', selectable.map((i) => [i.product_id, i.variant_id, i.qty])],
    queryFn: () => api.preview(selectable.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty }))),
    enabled: selectable.length > 0,
  });

  // Produk pelengkap: diambil dari katalog asli, bukan dummy.
  const related = useQuery({
    queryKey: ['cart-related'],
    queryFn: async () => (await api.products({ per_page: 4 })).items.filter((i) => i.is_active),
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
        <span className="material-symbols-outlined mx-auto mb-3 block !text-[56px] text-outline" aria-hidden>shopping_cart</span>
        <h1 className={pageTitle}>Keranjangmu masih kosong</h1>
        <p className="mb-6 text-muted">Yuk, temukan perlengkapan yang kamu butuhkan.</p>
        <Link to="/" className={btn('primary', 'md')}>Mulai belanja</Link>
      </section>
    );
  }

  // Kelompokkan barang per toko, urutan mengikuti kemunculan pertama di keranjang.
  const groups: StoreGroup[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.storeId === item.store_id);
    if (!group) {
      group = { storeId: item.store_id, storeName: item.store_name, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  const checkoutLabel = selected.length > 0 ? `Checkout (${selectedCount})` : 'Checkout';

  const checkoutButton = (extra: string) => (
    <Link
      to="/checkout"
      className={`${btnOrange} ${extra}`}
      aria-disabled={!checkoutReady}
      onClick={(e) => {
        if (!checkoutReady) e.preventDefault();
      }}
    >
      {checkoutLabel}
      <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
    </Link>
  );

  return (
    <section className="pb-28 lg:pb-0">
      <h1 className={pageTitle}>Keranjang belanja</h1>
      <p className={pageSub}>Centang barang yang ingin dibayar sekarang.</p>

      {/* DEMO: pita kepatuhan fiskal di atas keranjang. */}
      <p className="mb-4 flex flex-wrap items-center gap-2 rounded-field bg-success-soft px-3.5 py-2.5 text-sm text-on-success-soft">
        <span className="material-symbols-outlined !text-[18px]" aria-hidden>verified</span>
        <span className="font-semibold">{DEMO_COMPLIANCE_BANNER.cart}</span>
        <span className="inline-flex h-5 items-center rounded-pill bg-surface px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-success-soft">{DEMO_COMPLIANCE_BANNER.tag}</span>
      </p>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-4 py-2`}>
            <label className="!flex min-h-11 cursor-pointer flex-row items-center gap-2.5 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                className={checkbox}
                checked={allSelected}
                onChange={(e) => toggleAll.mutate(e.target.checked)}
                disabled={toggleAll.isPending}
              />
              Pilih semua ({items.length})
            </label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tabular-nums text-muted">{selected.length} jenis dipilih</span>
              {/* Batalkan pilihan memakai aksi pilih-semua yang sudah ada (nilai false). */}
              <button
                type="button"
                className={btn('danger', 'sm', 'min-h-11')}
                onClick={() => toggleAll.mutate(false)}
                disabled={toggleAll.isPending || selected.length === 0}
              >
                Batalkan pilihan
              </button>
            </div>
          </div>

          {/* DEMO: banner kesiapan pengadaan BOS. */}
          <div className={`${card} flex gap-3 p-4`}>
            <span className="material-symbols-outlined mt-0.5 !text-[22px] text-primary" aria-hidden>assured_workload</span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                {DEMO_CART_BANNER.title}
                <span className="inline-flex h-5 items-center rounded-pill bg-accent px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-primary">{DEMO_CART_BANNER.tag}</span>
              </p>
              <p className="m-0 text-xs text-muted">{DEMO_CART_BANNER.body}</p>
            </div>
          </div>

          {issues.length > 0 && (
            <p className={alertError}>
              Ada barang yang tidak tersedia atau stoknya kurang: {issues.map((i) => i.name).join(', ')}. Sesuaikan jumlahnya sebelum checkout.
            </p>
          )}

          {groups.map((group) => (
            <div key={group.storeId} className={`${card} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-soft bg-surface-low px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="m-0 flex min-w-0 items-center gap-2 font-display text-[15px] font-semibold text-ink">
                    <span className="material-symbols-outlined !text-[20px] text-primary" aria-hidden>storefront</span>
                    <span className="truncate">{group.storeName}</span>
                  </h2>
                  {/* DEMO: badge PKP dan lokasi toko (belum ada di API). */}
                  <span className="inline-flex h-6 items-center gap-1 rounded-pill bg-success-soft px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-success-soft">
                    <span className="material-symbols-outlined !text-[14px]" aria-hidden>verified</span>
                    {DEMO_STORE_TAGS.pkp} terverifikasi
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <span className="material-symbols-outlined !text-[14px]" aria-hidden>location_on</span>
                    {demoStoreLocation(group.storeId)}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-muted">
                  {group.items.length} jenis barang
                </span>
              </div>

              <ul className="m-0 flex list-none flex-col p-0">
                {group.items.map((item) => {
                  const unavailable = !item.is_active;
                  const lowStock = !unavailable && item.stock < item.qty;
                  return (
                    <li
                      key={`${item.product_id}-${item.variant_id}`}
                      className={`flex flex-col gap-3 border-b border-outline-soft p-4 transition-opacity last:border-b-0 md:flex-row md:items-center md:gap-4 ${item.selected ? '' : 'opacity-60'}`}
                    >
                      {/* Baris atas di mobile: centang, gambar, info. Di desktop wrapper ini tidak membuat kotak (md:contents). */}
                      <div className="flex min-w-0 items-start gap-3 md:contents">
                        <label className={touchLabel}>
                          <input
                            type="checkbox"
                            className={checkbox}
                            checked={item.selected}
                            onChange={(e) => toggleOne.mutate({ productId: item.product_id, variantId: item.variant_id, selected: e.target.checked })}
                            aria-label={`Pilih ${item.name}`}
                          />
                        </label>
                        <div className="size-24 shrink-0 overflow-hidden rounded-field border border-outline-soft bg-surface-low">
                          <ProductImage name={item.name} src={item.image_url} className="h-full w-full rounded-none text-[28px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/products/${item.product_id}`}
                            className="break-words font-display text-[15px] font-semibold leading-6 text-ink no-underline hover:text-primary"
                          >
                            {item.name}
                            <span className="block text-xs font-normal text-muted">dari {item.store_name}</span>
                          </Link>
                          {/* Harga besar font-mono dengan keterangan PPN. */}
                          <p className="m-0 mt-1 font-mono text-lg font-bold tabular-nums text-ink">
                            {rp(item.price)}
                            <span className="ml-1 font-body text-xs font-normal text-muted">/ buah</span>
                          </p>
                          <p className="m-0 text-xs text-muted">
                            {item.is_taxable ? 'Sudah termasuk PPN 11%' : 'Tidak kena PPN'}
                          </p>
                          {(unavailable || lowStock) && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {unavailable && <span className={tagDanger}>Tidak tersedia</span>}
                              {lowStock && <span className={tagDanger}>Stok tersisa {item.stock}</span>}
                            </div>
                          )}
                          {!unavailable && !lowStock && (
                            <p className="m-0 mt-1 text-xs text-muted">Stok tersedia {item.stock}</p>
                          )}
                        </div>
                      </div>

                      {/* Baris bawah di mobile: jumlah, subtotal, hapus. */}
                      <div className="flex flex-wrap items-center gap-3 md:contents">
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
                        <div className="ml-auto min-w-[104px] text-right md:min-w-[120px]">
                          <span className="block text-[11px] font-medium uppercase tracking-[0.05em] text-muted md:hidden">Subtotal</span>
                          <span className="block font-mono text-base font-bold tabular-nums text-ink">
                            {rp(Number(item.price) * item.qty)}
                          </span>
                        </div>
                        <button
                          className={btn('danger', 'xs', 'min-h-11 min-w-11')}
                          onClick={() => remove.mutate({ productId: item.product_id, variantId: item.variant_id })}
                        >
                          Hapus
                        </button>
                      </div>

                      {/* DEMO: catatan untuk penjual (hanya tampilan, belum tersimpan). */}
                      <input
                        type="text"
                        className="block min-h-11 w-full rounded-field border border-outline-soft bg-surface-low px-3 text-sm text-ink placeholder:text-muted md:order-last md:basis-full"
                        placeholder="Catatan untuk penjual (contoh)"
                        aria-label={`Catatan untuk ${item.name}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* DEMO: kartu surat penawaran resmi (SPH). */}
          <div className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
            <div className="flex min-w-0 items-start gap-3">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>description</span>
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold text-ink">{DEMO_SPH.title}</p>
                <p className="m-0 text-xs text-muted">{DEMO_SPH.body}</p>
              </div>
            </div>
            <button type="button" className={btn('default', 'md', 'min-h-11')}>{DEMO_SPH.button}</button>
          </div>

          {/* Pelengkap pengadaan dari katalog asli. */}
          {related.data && related.data.length > 0 && (
            <section className="mt-4 flex flex-col gap-4" aria-labelledby="cart-related-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="cart-related-title" className="m-0 font-display text-lg font-semibold text-ink">
                    {/* DEMO: judul dan teks pengantar bagian pelengkap. */}
                    {DEMO_RELATED.title}
                  </h2>
                  <p className="m-0 mt-1 text-sm text-muted">{DEMO_RELATED.body}</p>
                </div>
                <Link to="/" className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold text-primary no-underline hover:underline">
                  {DEMO_RELATED.more} →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {related.data.slice(0, 4).map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className={`${card} flex flex-col gap-4 self-start p-5 md:p-6 lg:sticky lg:top-[100px]`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 font-display text-lg font-semibold text-ink">Ringkasan pesanan</h2>
            {/* Jumlah toko terpilih dihitung dari data keranjang asli. */}
            <span className="inline-flex h-6 items-center rounded-pill bg-secondary-container px-2.5 text-xs font-semibold text-on-secondary-container">
              {selectedStores} toko terpilih
            </span>
          </div>
          {selected.length === 0 && <p className="m-0 text-muted">Belum ada barang yang dipilih.</p>}
          {preview.isPending && selectable.length > 0 && <p className="m-0 text-muted">Menghitung…</p>}
          {preview.isError && <p className={alertError}>{(preview.error as Error).message}</p>}
          {preview.data && selected.length > 0 && <Breakdown data={preview.data} />}
          <p className="m-0 text-xs text-muted">Ongkos kirim final dihitung saat checkout dan tidak dikenai PPN.</p>

          {/* DEMO: kupon. Kode promo sebenarnya diisi di checkout, jadi kolom ini hanya tampilan. */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-2">
              Kupon pengadaan / kode promo
              <div className="flex items-stretch gap-2">
                <input
                  className="block min-h-11 min-w-0 flex-1 rounded-field border border-outline bg-surface px-3.5 font-mono text-sm uppercase text-ink placeholder:text-muted"
                  placeholder="Masukkan kode promo"
                  disabled
                />
                <button type="button" className={btn('default', 'md', 'shrink-0')} disabled>Terapkan</button>
              </div>
            </label>
            <p className="m-0 text-xs text-muted">{DEMO_CART_COUPON_NOTE}</p>
          </div>

          {/* DEMO: jaminan rekening institusi (escrow). */}
          <div className="flex flex-col gap-2 rounded-field bg-surface-low p-3.5">
            <p className="m-0 flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="material-symbols-outlined !text-[18px] text-success" aria-hidden>security</span>
              {DEMO_CART_ESCROW.title}
            </p>
            <p className="m-0 text-xs text-muted">{DEMO_CART_ESCROW.body}</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_CART_ESCROW.tags.map((t) => (
                <span key={t} className="inline-flex h-5 items-center rounded-pill bg-surface px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-ink-2">{t}</span>
              ))}
            </div>
          </div>

          {checkoutButton('h-[52px] w-full text-base lg:h-12 lg:text-[15px] max-lg:hidden')}

          {/* DEMO: bantuan pajak dan BAST. */}
          <div className="flex items-center justify-between gap-3 border-t border-outline-soft pt-3">
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-ink">{DEMO_HELP_CARD.title}</p>
              <p className="m-0 text-xs text-muted">{DEMO_HELP_CARD.body}</p>
            </div>
            <Link to="/bantuan" className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary no-underline hover:underline">
              {DEMO_HELP_CARD.button}
            </Link>
          </div>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-14 z-[29] flex items-center justify-between gap-3 border-t border-outline-soft bg-surface px-3.5 py-2.5 shadow-[0_-8px_20px_-16px_rgba(0,0,0,0.3)] md:bottom-0 lg:hidden"
        role="region"
        aria-label="Ringkasan belanja"
      >
        <label className="!flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center gap-2 text-xs font-semibold text-ink-2">
          <input
            type="checkbox"
            className={checkbox}
            checked={allSelected}
            onChange={(e) => toggleAll.mutate(e.target.checked)}
            disabled={toggleAll.isPending}
            aria-label="Pilih semua barang"
          />
          <span className="font-body">Semua ({items.length})</span>
        </label>
        <div className="flex min-w-0 flex-1 flex-col items-end">
          <span className="text-xs text-muted">Total tagihan</span>
          <strong className="font-mono text-lg font-bold tabular-nums text-primary">
            {preview.data && selected.length > 0 ? rp(preview.data.grand_total) : '—'}
          </strong>
        </div>
        <Link
          to="/checkout"
          className={`${btnOrange} h-12 shrink-0 px-5 text-[15px]`}
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
