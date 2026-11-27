import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
import { DestinationSearch } from '../components/DestinationSearch';
import { CheckoutSkeleton } from '../components/FlowSkeleton';
import { alertError, btn, card, field, label, pageSub, pageTitle, sectionTitle } from '../components/flowClasses';
import type { ShippingChoice, ShippingDestination, StoreShippingOptions } from '../api/types';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Lima layanan termurah, ditambah pilihan yang sedang dipilih bila berada di luar daftar itu. */
function visibleOptions(
  options: StoreShippingOptions['options'],
  selectedKey: string | undefined,
  showAll: boolean | undefined,
) {
  const sorted = [...options].sort((a, b) => Number(a.cost) - Number(b.cost));
  if (showAll) return sorted;
  const head = sorted.slice(0, 5);
  const selected = sorted.find((o) => `${o.code}|${o.service}` === selectedKey);
  if (selected && !head.includes(selected)) head.push(selected);
  return head;
}

export default function Checkout() {
  useSeo({ title: 'Checkout', noindex: true });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart });
  const [address, setAddress] = useState('');
  const [npwp, setNpwp] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const items = (cart.data ?? []).filter((i) => i.selected);
  const ready = items.length > 0 && items.every((i) => i.is_active && i.stock >= i.qty);

  // Cek ongkir RajaOngkir: aktif jika server punya kunci API. Jika tidak, ongkir flat per toko.
  const [destination, setDestination] = useState<ShippingDestination | null>(null);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [showAllCouriers, setShowAllCouriers] = useState<Record<number, boolean>>({});
  const shippingStatus = useQuery({ queryKey: ['shipping-status'], queryFn: api.shippingStatus, staleTime: 300_000 });
  const shippingOn = shippingStatus.data?.enabled === true;
  const itemsKey = items.map((i) => `${i.product_id}:${i.variant_id}:${i.qty}`).join(',');
  const options = useQuery({
    queryKey: ['ship-options', destination?.id, itemsKey],
    queryFn: () => api.shippingOptions(destination!.id),
    enabled: shippingOn && !!destination && ready,
    retry: false,
  });

  // Pilih kurir termurah untuk setiap toko yang belum punya pilihan yang valid
  useEffect(() => {
    if (!options.data) return;
    setChoices((prev) => {
      const next = { ...prev };
      for (const store of options.data) {
        const current = next[store.store_id];
        const valid = store.options.some((o) => `${o.code}|${o.service}` === current);
        if (!valid && store.options.length > 0) {
          const cheapest = [...store.options].sort((a, b) => Number(a.cost) - Number(b.cost))[0];
          next[store.store_id] = `${cheapest.code}|${cheapest.service}`;
        }
      }
      return next;
    });
  }, [options.data]);

  const choiceList: ShippingChoice[] = (options.data ?? []).flatMap((store) => {
    const key = choices[store.store_id];
    if (!key) return [];
    const [code, service] = key.split('|');
    return [{ store_id: store.store_id, code, service }];
  });
  const shippingReady =
    !shippingOn ||
    (!!destination &&
      !!options.data &&
      options.data.length > 0 &&
      options.data.every((store) => store.options.length > 0 && choices[store.store_id]));
  const shipping = shippingOn && destination ? { destination_id: destination.id, choices: choiceList } : undefined;

  const preview = useQuery({
    queryKey: ['preview', 'checkout', appliedPromo, items.map((i) => [i.product_id, i.variant_id, i.qty]), shipping],
    queryFn: () =>
      api.preview(
        items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })),
        appliedPromo,
        shipping,
      ),
    enabled: ready && (!shippingOn || shippingReady),
    retry: false,
  });

  const checkout = useMutation({
    mutationFn: () =>
      api.checkout({
        shipping_address: address.trim(),
        promo_code: appliedPromo || undefined,
        buyer_npwp: npwp.trim() || undefined,
        ...(shipping ? { destination_id: shipping.destination_id, destination_label: destination?.label, shipping: shipping.choices } : {}),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Satu pesanan per toko. Jika hanya satu toko dan pembayaran siap, langsung ke Midtrans.
      const first = res.orders[0];
      if (res.orders.length === 1 && first.payment_url) {
        window.location.assign(first.payment_url);
      } else if (res.orders.length === 1) {
        navigate(`/orders/${first.order.id}`, { state: { paymentFailed: true } });
      } else {
        // Beberapa toko: pembeli membayar tiap pesanan dari daftar pesanan.
        navigate('/orders', { state: { created: res.orders.length } });
      }
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Checkout gagal. Coba lagi.'),
  });

  if (cart.isPending) {
    return (
      <div role="status">
        <span className="sr-only">Memuat…</span>
        <CheckoutSkeleton />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <section className="px-4 py-16 text-center">
        <h1 className={pageTitle}>Keranjang kosong</h1>
        <p className="mb-6 text-muted">Belum ada barang yang dipilih di keranjang.</p>
        <Link to="/cart" className={btn('primary', 'md')}>Kembali ke keranjang</Link>
      </section>
    );
  }

  const canSubmit = ready && shippingReady && address.trim().length >= 10 && !checkout.isPending;

  return (
    <section>
      <h1 className={pageTitle}>Checkout</h1>
      <p className={pageSub}>Lengkapi alamat, lalu bayar dengan aman lewat Midtrans.</p>
      {!ready && (
        <p className={`${alertError} mb-4`}>Ada produk yang tidak tersedia atau stoknya kurang. Kembali ke keranjang untuk menyesuaikan.</p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <form
          className="flex min-w-0 flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            checkout.mutate();
          }}
        >
          <div className={`${card} p-5 md:p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>location_on</span>Alamat pengiriman
            </h2>
            <p className="-mt-1 mb-4 text-[13px] text-muted">Tulis alamat lengkap termasuk nama penerima dan nomor telepon.</p>
            <label className={label}>
              Alamat lengkap
              <textarea
                rows={4}
                className={`${field} resize-y`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nama penerima, alamat lengkap, kota, kode pos, nomor telepon"
                required
                minLength={10}
              />
            </label>
          </div>

          {shippingOn && (
            <div className={`${card} p-5 md:p-6`}>
              <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
                <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>local_shipping</span>Tujuan dan kurir
              </h2>
              <p className="-mt-1 mb-4 text-[13px] text-muted">Pilih kota atau kecamatan tujuan, lalu pilih kurir untuk setiap toko.</p>
              <label className={label} htmlFor="dest-search">
                Tujuan pengiriman
                <DestinationSearch id="dest-search" value={destination} onChange={setDestination} />
              </label>
              {destination && options.isPending && <p className="mt-4 text-sm text-muted">Menghitung ongkir…</p>}
              {destination && options.isError && <p className={`${alertError} mt-4`}>{(options.error as Error).message}</p>}
              {options.data?.map((store) => (
                <fieldset key={store.store_id} className="mt-5 border-0 p-0">
                  <legend className="mb-2 font-semibold text-ink">
                    {store.store_name} <span className="text-xs font-normal text-muted">· {(store.weight_grams / 1000).toLocaleString('id-ID')} kg</span>
                  </legend>
                  {store.options.length === 0 ? (
                    <p className="text-sm text-error">Toko ini belum mengatur lokasi asal pengiriman, atau tidak ada kurir untuk rute ini.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {visibleOptions(store.options, choices[store.store_id], showAllCouriers[store.store_id]).map((o) => {
                          const key = `${o.code}|${o.service}`;
                          return (
                            <label key={key} className="!flex !flex-row cursor-pointer items-center gap-3 rounded-field border border-outline-soft p-3 text-left text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary-container/40">
                              <input
                                type="radio"
                                name={`ship-${store.store_id}`}
                                checked={choices[store.store_id] === key}
                                onChange={() => setChoices((prev) => ({ ...prev, [store.store_id]: key }))}
                                className="!h-4 !w-4 !flex-none accent-primary"
                              />
                              <span className="min-w-0 flex-1 !text-left">
                                <strong className="font-semibold text-ink">{o.name} · {o.service}</strong>
                                <span className="!block !text-left text-xs text-muted">{o.description || 'Layanan reguler'} · estimasi {o.etd || '-'}</span>
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-ink">{rp(o.cost)}</span>
                            </label>
                          );
                        })}
                      {store.options.length > 5 && (
                        <button
                          type="button"
                          className="mt-1 self-start text-sm font-semibold text-primary hover:underline"
                          onClick={() => setShowAllCouriers((prev) => ({ ...prev, [store.store_id]: !prev[store.store_id] }))}
                        >
                          {showAllCouriers[store.store_id] ? 'Tampilkan lebih sedikit' : `Lihat semua layanan (${store.options.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </fieldset>
              ))}
            </div>
          )}

          <div className={`${card} p-5 md:p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>receipt_long</span>Faktur pajak
            </h2>
            <p className="-mt-1 mb-4 text-[13px] text-muted">Opsional. Isi jika kamu membutuhkan faktur pajak atas nama NPWP.</p>
            <label className={label}>
              NPWP pembeli
              <input className={field} value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="15 atau 16 digit" />
            </label>
          </div>

          <div className={`${card} p-5 md:p-6`}>
            <h2 className={`${sectionTitle} flex items-center gap-2.5 text-lg`}>
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>payments</span>Metode pembayaran
            </h2>
            <p className="flex items-start gap-2.5 rounded-field bg-surface-low p-3.5 text-sm text-ink-2">
              <span className="material-symbols-outlined mt-px !text-[20px] text-primary" aria-hidden>lock</span>
              Setelah klik bayar, kamu diarahkan ke halaman pembayaran Midtrans yang aman. Semua metode yang tersedia ditampilkan di sana.
            </p>
          </div>

          {error && <p className={alertError}>{error}</p>}
        </form>

        <aside className={`${card} self-start p-5 md:p-6 lg:sticky lg:top-[100px]`}>
          <h2 className="mt-0 mb-4 font-display text-lg font-semibold text-ink">Ringkasan pesanan</h2>
          <ul className="m-0 mb-4 flex list-none flex-col gap-3 p-0">
            {items.map((i) => (
              <li key={`${i.product_id}-${i.variant_id}`} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <strong className="font-semibold text-ink">{i.name}</strong>
                  <div className="text-xs text-muted">{i.qty} × {rp(i.price)}</div>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-ink">{rp(Number(i.price) * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-stretch gap-2">
            <input
              className={`${field} min-w-0 flex-1 font-mono uppercase`}
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Kode promo"
              aria-label="Kode promo"
            />
            <button
              type="button"
              className={btn('default', 'md', 'shrink-0')}
              onClick={() => setAppliedPromo(promoInput.trim())}
              disabled={!promoInput.trim()}
            >
              Terapkan
            </button>
          </div>
          {appliedPromo && (
            <p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
              {preview.data ? `Promo ${appliedPromo} diterapkan.` : ''}
              <button
                type="button"
                className={btn('text', 'sm')}
                onClick={() => {
                  setAppliedPromo('');
                  setPromoInput('');
                }}
              >
                Hapus
              </button>
            </p>
          )}
          {preview.isError && <p className={`${alertError} mt-3`}>{(preview.error as Error).message}</p>}

          <div className="mt-4">
            {ready && preview.isPending && <p className="text-muted">Menghitung…</p>}
            {preview.data && <Breakdown data={preview.data} />}
          </div>

          <button
            className={btn('primary', 'xl', 'mt-5 w-full')}
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              checkout.mutate();
            }}
          >
            {checkout.isPending
              ? 'Memproses…'
              : preview.data
                ? `Bayar ${rp(preview.data.grand_total)}`
                : 'Bayar sekarang'}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <span className="material-symbols-outlined !text-base text-success" aria-hidden>verified_user</span>
            Pembayaran diproses Midtrans. Pesanan dibatalkan otomatis jika tidak dibayar dalam 24 jam.
          </p>
        </aside>
      </div>
    </section>
  );
}
