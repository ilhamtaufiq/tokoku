import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
import { DestinationSearch } from '../components/DestinationSearch';
import { CheckoutSkeleton } from '../components/FlowSkeleton';
import { alertError, btn, card, field, label, pageSub, pageTitle } from '../components/flowClasses';
import type { CartItem, ShippingChoice, ShippingDestination, StoreShippingOptions } from '../api/types';
import {
  DEMO_BOS_DOCS,
  DEMO_CHECKOUT_ADDRESS,
  DEMO_CHECKOUT_INSURANCE,
  DEMO_COMPLIANCE_BANNER,
  DEMO_HELP_CARD,
  DEMO_PAYMENT_CARD,
  DEMO_PAYMENT_CHIPS,
  DEMO_STORE_TAGS,
  demoStoreLocation,
} from '../data/demo';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Tombol oranye pill untuk bayar (warna merek dari DESIGN.md, sama di mode terang dan gelap). */
const btnOrange =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-transparent bg-[#ea580c] font-body font-semibold text-white no-underline cursor-pointer select-none shadow-cta transition-colors duration-150 hover:bg-[#c2410c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none [&_.material-symbols-outlined]:!text-[20px]';

const checkbox = 'm-0 !h-[18px] !w-[18px] min-h-0 !flex-none cursor-pointer p-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50';

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

/** Langkah checkout sebagai penunjuk visual. Langkah ini berada di tahap kedua. */
const steps = ['Keranjang', 'Pengiriman & Pajak', 'Pembayaran'];

/** Kelompokkan barang yang dipilih per toko, urutan mengikuti kemunculan pertama. */
function groupByStore(items: CartItem[]) {
  const groups: { storeId: number; storeName: string; items: CartItem[] }[] = [];
  for (const item of items) {
    let g = groups.find((x) => x.storeId === item.store_id);
    if (!g) {
      g = { storeId: item.store_id, storeName: item.store_name, items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
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
  const [bosDocs] = useState(true); // DEMO: opsi dokumen BOS (hanya tampilan)

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
  const payLabel = checkout.isPending
    ? 'Memproses…'
    : preview.data
      ? `Bayar ${rp(preview.data.grand_total)}`
      : 'Bayar sekarang';
  const groups = groupByStore(items);
  // Format NPWP: 15 atau 16 digit. Status ini dihitung dari isian pembeli, bukan dummy.
  const npwpDigits = npwp.replace(/\D/g, '');
  const npwpValid = npwpDigits.length === 15 || npwpDigits.length === 16;

  const payButton = (extra: string) => (
    <button
      className={`${btnOrange} ${extra}`}
      disabled={!canSubmit}
      onClick={(e) => {
        e.preventDefault();
        setError(null);
        checkout.mutate();
      }}
    >
      {payLabel}
      <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
    </button>
  );

  return (
    <section className="pb-28 lg:pb-0">
      <h1 className={pageTitle}>Checkout</h1>
      <p className={pageSub}>Lengkapi alamat, lalu bayar dengan aman lewat Midtrans.</p>

      {/* DEMO: pita kepatuhan fiskal di atas checkout. */}
      <p className="mb-4 flex flex-wrap items-center gap-2 rounded-field bg-success-soft px-3.5 py-2.5 text-sm text-on-success-soft">
        <span className="material-symbols-outlined !text-[18px]" aria-hidden>verified</span>
        <span className="font-semibold">{DEMO_COMPLIANCE_BANNER.checkout}</span>
        <span className="inline-flex h-5 items-center rounded-pill bg-surface px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-success-soft">{DEMO_COMPLIANCE_BANNER.tag}</span>
      </p>

      <ol className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-outline-soft bg-surface p-4 text-xs font-semibold text-muted" aria-label="Langkah checkout">
        {steps.map((step, idx) => {
          const current = idx === 1;
          const done = idx === 0;
          return (
            <li key={step} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
              <span
                className={`flex size-6 items-center justify-center rounded-pill font-mono text-[11px] font-bold ${
                  done
                    ? 'bg-success-soft text-on-success-soft'
                    : current
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-high text-muted'
                }`}
                aria-hidden
              >
                {done ? '✓' : idx + 1}
              </span>
              <span className={current ? 'text-ink' : undefined}>{step}</span>
              {idx < steps.length - 1 && <span className="ml-1 hidden h-px w-6 bg-outline-soft sm:inline-block" aria-hidden />}
            </li>
          );
        })}
      </ol>

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
          {/* Kartu alamat instansi, lengkap dengan NPWP untuk e-Faktur. */}
          <div className={`${card} flex flex-col gap-4 p-5 md:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 flex items-center gap-2.5 font-display text-lg font-semibold text-ink">
                <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>location_on</span>
                Alamat tujuan pengiriman
              </h2>
              {/* DEMO: pilih alamat lain (buku alamat belum tersedia). */}
              <button type="button" className={btn('text', 'sm', 'min-h-11')}>{DEMO_CHECKOUT_ADDRESS.pickNew}</button>
            </div>
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

            {shippingOn && (
              <label className={label} htmlFor="dest-search">
                Tujuan pengiriman (kota atau kecamatan)
                <DestinationSearch id="dest-search" value={destination} onChange={setDestination} />
              </label>
            )}
            {shippingOn && destination && options.isPending && <p className="m-0 text-sm text-muted">Menghitung ongkir…</p>}
            {shippingOn && destination && options.isError && <p className={alertError}>{(options.error as Error).message}</p>}

            {/* NPWP: kolom asli, dibungkus kotak ala e-Faktur. */}
            <div className="flex flex-col gap-2 rounded-field border border-outline-soft bg-surface-low p-3.5">
              <label className={label}>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  NPWP pembeli
                  {/* DEMO: keterangan NPWP instansi untuk e-Faktur. */}
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-muted">{DEMO_CHECKOUT_ADDRESS.npwpCaption}</span>
                </span>
                <span className="flex items-center gap-2">
                  <input
                    className={`${field} font-mono tabular-nums tracking-[0.02em]`}
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    placeholder="15 atau 16 digit"
                    inputMode="numeric"
                  />
                  {npwpValid && <span className="material-symbols-outlined shrink-0 text-success" aria-label="NPWP valid">check_circle</span>}
                </span>
              </label>
              <p className="m-0 text-xs text-muted">Opsional. Isi jika kamu membutuhkan faktur pajak atas nama NPWP.</p>
            </div>
          </div>

          {/* Kartu per toko: barang, kurir per toko, dan badge toko resmi/PKP. */}
          {groups.map((group, gIdx) => {
            const storeOptions = options.data?.find((s) => s.store_id === group.storeId);
            return (
              <div key={group.storeId} className={`${card} overflow-hidden`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-soft bg-surface-low px-5 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="m-0 flex min-w-0 items-center gap-2 font-display text-[15px] font-semibold text-ink">
                      <span className="material-symbols-outlined !text-[20px] text-primary" aria-hidden>storefront</span>
                      <span className="truncate">{group.storeName}</span>
                    </h2>
                    {/* DEMO: badge toko resmi dan PKP (belum ada di API). */}
                    <span className="inline-flex h-5 items-center rounded-pill bg-primary px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-primary">{DEMO_STORE_TAGS.official}</span>
                    <span className="inline-flex h-5 items-center rounded-pill bg-success-soft px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-success-soft">{DEMO_STORE_TAGS.pkp}</span>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-mono tabular-nums">Toko {gIdx + 1}/{groups.length}</span>
                    {/* DEMO: lokasi toko dummy. */}
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined !text-[14px]" aria-hidden>location_on</span>
                      {demoStoreLocation(group.storeId)}
                    </span>
                  </span>
                </div>

                <ul className="m-0 flex list-none flex-col gap-3 p-5">
                  {group.items.map((i) => (
                    <li key={`${i.product_id}-${i.variant_id}`} className="flex gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 break-words font-display text-[15px] font-semibold text-ink">{i.name}</p>
                        <p className="m-0 mt-0.5 text-xs text-muted">{i.qty} unit</p>
                        <p className="m-0 mt-1 font-mono text-sm tabular-nums text-ink-2">{rp(i.price)} <span className="font-body text-xs text-muted">{i.is_taxable ? 'sudah termasuk PPN' : 'tidak kena PPN'}</span></p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-ink">{rp(Number(i.price) * i.qty)}</span>
                    </li>
                  ))}
                </ul>

                {/* Pilihan kurir per toko (data asli dari RajaOngkir bila aktif). */}
                <div className="flex flex-col gap-3 border-t border-outline-soft bg-surface-low p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className="material-symbols-outlined !text-[18px] text-primary" aria-hidden>local_shipping</span>
                      Opsi pengiriman
                    </span>
                    {storeOptions && <span className="font-mono text-xs text-muted">{storeOptions.options.length} opsi tersedia</span>}
                  </div>

                  {!shippingOn && (
                    <p className="m-0 text-sm text-ink-2">Ongkos kirim flat per toko, tanpa PPN. Nilai final dihitung saat pembayaran.</p>
                  )}
                  {shippingOn && !destination && (
                    <p className="m-0 text-sm text-muted">Pilih tujuan pengiriman di atas untuk melihat pilihan kurir.</p>
                  )}
                  {shippingOn && destination && storeOptions && storeOptions.options.length === 0 && (
                    <p className="m-0 text-sm text-error">Toko ini belum mengatur lokasi asal pengiriman, atau tidak ada kurir untuk rute ini.</p>
                  )}
                  {shippingOn && storeOptions && storeOptions.options.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleOptions(storeOptions.options, choices[storeOptions.store_id], showAllCouriers[storeOptions.store_id]).map((o, oIdx) => {
                          const key = `${o.code}|${o.service}`;
                          const on = choices[storeOptions.store_id] === key;
                          return (
                            <label
                              key={key}
                              className={`flex min-h-11 cursor-pointer flex-col gap-2 rounded-field border-[1.5px] bg-surface p-3.5 text-left text-sm transition-colors ${
                                on ? 'border-primary bg-secondary-container/40' : 'border-outline-soft hover:border-primary'
                              }`}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`ship-${storeOptions.store_id}`}
                                    checked={on}
                                    onChange={() => setChoices((prev) => ({ ...prev, [storeOptions.store_id]: key }))}
                                    className="!h-4 !w-4 !flex-none accent-primary"
                                  />
                                  <strong className="min-w-0 font-semibold leading-5 text-ink">{o.name} · {o.service}</strong>
                                </span>
                                <span className="shrink-0 font-mono font-semibold tabular-nums text-ink">{rp(o.cost)}</span>
                              </span>
                              <span className="pl-6 text-xs leading-4 text-muted">{o.description || 'Layanan reguler'} · estimasi {o.etd || '-'}</span>
                              <span className="flex items-center gap-2 pl-6">
                                {oIdx === 0 && <span className="inline-flex h-5 items-center rounded-pill bg-error-soft px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-on-error-soft">Termurah</span>}
                                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-success">Bebas PPN</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {storeOptions.options.length > 5 && (
                        <button
                          type="button"
                          className="min-h-11 self-start text-sm font-semibold text-primary hover:underline"
                          onClick={() => setShowAllCouriers((prev) => ({ ...prev, [storeOptions.store_id]: !prev[storeOptions.store_id] }))}
                        >
                          {showAllCouriers[storeOptions.store_id] ? 'Tampilkan lebih sedikit' : `Lihat semua layanan (${storeOptions.options.length})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* DEMO: dokumen pertanggungjawaban BOS (hanya tampilan, tidak mengubah pesanan). */}
          <div className={`${card} flex flex-col gap-3 p-5 md:p-6`}>
            <label className="!flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" className={`${checkbox} mt-1`} defaultChecked={bosDocs} aria-label={DEMO_BOS_DOCS.title} />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-ink">{DEMO_BOS_DOCS.title}</span>
                <span className="text-xs text-muted">{DEMO_BOS_DOCS.body}</span>
                <span className="mt-1 w-fit rounded-field bg-surface-low px-2.5 py-1 font-mono text-[11px] text-ink-2">{DEMO_BOS_DOCS.format}</span>
              </span>
            </label>
          </div>

          <div className={`${card} flex flex-col gap-3 p-5 md:p-6`}>
            <h2 className="m-0 flex items-center gap-2.5 font-display text-lg font-semibold text-ink">
              <span className="material-symbols-outlined !text-[22px] text-primary" aria-hidden>payments</span>Metode pembayaran
            </h2>
            <p className="flex items-start gap-2.5 rounded-field bg-surface-low p-3.5 text-sm text-ink-2">
              <span className="material-symbols-outlined mt-px !text-[20px] text-primary" aria-hidden>lock</span>
              Setelah klik bayar, kamu diarahkan ke halaman pembayaran Midtrans yang aman. Semua metode yang tersedia ditampilkan di sana.
            </p>
            {/* DEMO: contoh kanal pembayaran (pemilihan sebenarnya dilakukan di Midtrans). */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{DEMO_PAYMENT_CARD.tag}</span>
              {DEMO_PAYMENT_CHIPS.map((c) => (
                <span key={c} className="inline-flex h-7 items-center rounded-pill border border-outline-soft bg-surface px-2.5 text-xs font-semibold text-ink-2">{c}</span>
              ))}
            </div>
            <p className="m-0 text-xs text-muted">{DEMO_PAYMENT_CARD.caption}</p>
          </div>

          {error && <p className={alertError}>{error}</p>}
        </form>

        <aside className={`${card} flex flex-col gap-4 self-start p-5 md:p-6 lg:sticky lg:top-[100px]`}>
          <h2 className="m-0 font-display text-lg font-semibold text-ink">Ringkasan pesanan</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((i) => (
              <li key={`${i.product_id}-${i.variant_id}`} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <strong className="font-semibold text-ink">{i.name}</strong>
                  <div className="font-mono text-xs tabular-nums text-muted">{i.qty} × {rp(i.price)}</div>
                </div>
                <span className="shrink-0 font-mono font-semibold tabular-nums text-ink">{rp(Number(i.price) * i.qty)}</span>
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
            <p className="m-0 flex items-center justify-between gap-2 text-xs text-muted">
              {preview.data ? `Promo ${appliedPromo} diterapkan.` : ''}
              <button
                type="button"
                className={btn('text', 'sm', 'min-h-11')}
                onClick={() => {
                  setAppliedPromo('');
                  setPromoInput('');
                }}
              >
                Hapus
              </button>
            </p>
          )}
          {preview.isError && <p className={alertError}>{(preview.error as Error).message}</p>}

          {/* DEMO: proteksi pengiriman belum tersedia dan tidak masuk total. */}
          <label className="flex items-center justify-between gap-3 rounded-field bg-surface-low px-3.5 py-2.5 text-sm text-muted">
            <span className="flex items-center gap-2">
              <input type="checkbox" className={checkbox} disabled aria-label={DEMO_CHECKOUT_INSURANCE.label} />
              {DEMO_CHECKOUT_INSURANCE.label}
            </span>
            <span className="shrink-0 text-xs">{DEMO_CHECKOUT_INSURANCE.note}</span>
          </label>

          <div>
            {ready && preview.isPending && <p className="m-0 text-muted">Menghitung…</p>}
            {preview.data && <Breakdown data={preview.data} />}
          </div>

          {payButton('h-[52px] w-full text-base max-lg:hidden')}
          <p className="m-0 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <span className="material-symbols-outlined !text-base text-success" aria-hidden>verified_user</span>
            Pembayaran diproses Midtrans. Pesanan dibatalkan otomatis jika tidak dibayar dalam 24 jam.
          </p>

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

      {/* Bar bayar sticky di mobile: total final dan tombol bayar. */}
      <div
        className="fixed inset-x-0 bottom-14 z-[29] flex items-center justify-between gap-3 border-t border-outline-soft bg-surface px-3.5 py-2.5 shadow-[0_-8px_20px_-16px_rgba(0,0,0,0.3)] md:bottom-0 lg:hidden"
        role="region"
        aria-label="Bayar"
      >
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted">Total tagihan final</span>
          <strong className="font-mono text-lg font-bold tabular-nums text-primary">
            {preview.data ? rp(preview.data.grand_total) : '—'}
          </strong>
        </div>
        {payButton('h-12 shrink-0 px-5 text-[15px]')}
      </div>
    </section>
  );
}
