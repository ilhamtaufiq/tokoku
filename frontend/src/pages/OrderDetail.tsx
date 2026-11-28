import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
import { ProductImage } from '../components/ProductImage';
import { DEMO_LPJ, DEMO_SELLER_LINK } from '../data/demo';
import { ORDER_STATUS_LABEL, formatDate, percent, rp, sisaWaktu } from '../lib/money';
import type { OrderDetail as OrderDetailType, OrderStatus, PaymentStatus } from '../api/types';
import { useSeo } from '../lib/seo';

const btnBase =
  'inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-pill border px-5 text-sm font-semibold no-underline transition-[background-color,border-color,color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45';
const btnPrimary = `${btnBase} border-primary bg-primary text-on-primary hover:brightness-110 active:opacity-85`;
const btnOutline = `${btnBase} border-outline bg-surface px-4 text-ink hover:border-primary hover:text-primary`;
const calloutInfo = 'my-3 rounded-field border border-outline-soft bg-surface-low px-4 py-3 text-sm text-ink-2';
const alertError = 'my-3 rounded-field bg-error-soft px-4 py-3 text-sm text-on-error-soft';
const alertSuccess = 'my-3 rounded-field bg-success-soft px-4 py-3 text-sm text-on-success-soft';
const card = 'rounded-card border border-outline-soft bg-surface p-5 shadow-card sm:p-6';
const cardTitle = 'mt-0 mb-3 font-display text-lg font-semibold leading-7 text-ink';
const eyebrow = 'font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted';

/** Urutan tahap pesanan untuk timeline (status yang dibatalkan ditangani terpisah). */
const TIMELINE: OrderStatus[] = ['pending_payment', 'paid', 'processing', 'shipped', 'completed'];

const statusTone: Record<string, string> = {
  pending_payment: 'bg-warning-soft text-on-warning-soft',
  paid: 'bg-primary-container text-on-primary',
  processing: 'bg-primary-container text-on-primary',
  shipped: 'bg-accent-soft text-on-accent-soft',
  completed: 'bg-success-soft text-on-success-soft',
  cancelled: 'bg-error-soft text-on-error-soft',
};

const PAYMENT_LABEL: Record<PaymentStatus, { text: string; tone: string }> = {
  paid: { text: 'Lunas', tone: 'bg-success-soft text-on-success-soft' },
  unpaid: { text: 'Belum dibayar', tone: 'bg-warning-soft text-on-warning-soft' },
  expired: { text: 'Kedaluwarsa', tone: 'bg-error-soft text-on-error-soft' },
  refunded: { text: 'Dana dikembalikan', tone: 'bg-surface-high text-ink-2' },
};

export default function OrderDetail() {
  useSeo({ title: 'Detail pesanan', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const location = useLocation();
  const [payError, setPayError] = useState<string | null>(null);

  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.order(orderId),
    // Saat menunggu pembayaran, cek ulang berkala: webhook bisa tiba beberapa detik setelah pembeli kembali
    refetchInterval: (q) => {
      const d = q.state.data as OrderDetailType | undefined;
      return d && d.status === 'pending_payment' && d.payment_status === 'unpaid' ? 5000 : false;
    },
  });

  const now = useNow();
  const pay = useMutation({
    mutationFn: () => api.payOrder(orderId),
    onSuccess: (res) => window.location.assign(res.payment_url),
    onError: (e) => setPayError(e instanceof ApiError ? e.message : 'Gagal membuat pembayaran.'),
  });

  if (order.isPending) {
    return (
      <section role="status" aria-busy="true" className="mx-auto flex max-w-[1040px] flex-col gap-5">
        <span className="sr-only">Memuat pesanan…</span>
        <div className="h-4 w-32 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
        <div className="flex flex-col gap-2">
          <div className="h-8 w-56 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
          <div className="h-3 w-36 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-64 animate-pulse rounded-card bg-surface-high motion-reduce:animate-none" />
          <div className="h-72 animate-pulse rounded-card bg-surface-high motion-reduce:animate-none" />
        </div>
      </section>
    );
  }
  if (order.isError || !order.data) {
    return <p className={alertError}>Pesanan tidak ditemukan.</p>;
  }

  const o = order.data;
  const waiting = o.status === 'pending_payment' && o.payment_status === 'unpaid';
  const remaining = Math.max(0, o.expires_in_seconds - Math.floor((now - order.dataUpdatedAt) / 1000));
  const paymentFailed = (location.state as { paymentFailed?: boolean } | null)?.paymentFailed;
  const cancelled = o.status === 'cancelled';
  const dispatched = o.status === 'shipped' || o.status === 'completed';
  const currentStep = TIMELINE.indexOf(o.status);
  const payment = PAYMENT_LABEL[o.payment_status];

  return (
    <section className="mx-auto max-w-[1040px]">
      <Link to="/orders" className="text-sm font-medium text-muted transition-colors hover:text-primary">← Semua pesanan</Link>

      <header className="mt-3 mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* DEMO */}
          <p className={`${eyebrow} mb-1`}>Detail pesanan pembeli</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="mb-0 break-all font-mono text-2xl font-bold tabular-nums tracking-[-0.3px] text-ink sm:text-[28px]">{o.invoice_no}</h1>
            <span
              className={`inline-flex h-8 items-center rounded-pill px-3.5 text-sm font-semibold ${
                statusTone[o.status] ?? 'bg-surface-high text-ink-2'
              }`}
            >
              {ORDER_STATUS_LABEL[o.status] ?? o.status}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-[18px] text-muted">
            {formatDate(o.created_at)}
            {o.store_name && <> · Toko {o.store_name}</>}
          </p>
        </div>
        {/* DEMO: tautan dummy, belum ada fitur chat penjual */}
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className={`${btnBase} border-accent bg-accent px-5 text-white hover:brightness-110`}
        >
          <span className="material-symbols-outlined !text-[18px]" aria-hidden>chat</span>
          {DEMO_SELLER_LINK}
        </a>
      </header>

      {o.status === 'cancelled' && o.payment_status === 'refunded' && (
        <p className={alertError}>Pesanan dibatalkan dan dana dikembalikan{o.refund_note ? `: ${o.refund_note}` : '.'}</p>
      )}
      {o.payment_status === 'paid' && (
        <p className={alertSuccess}>Pembayaran diterima. Terima kasih, pesananmu sedang kami proses.</p>
      )}
      {o.status === 'cancelled' && (
        o.payment_status !== 'refunded' && <p className={alertError}>Pesanan dibatalkan karena tidak dibayar tepat waktu. Stok sudah dikembalikan.</p>
      )}
      {waiting && (
        <div className="my-5 flex flex-wrap items-center gap-4 rounded-card border border-warning-soft bg-warning-soft p-5 text-on-warning-soft sm:gap-[18px] sm:px-6">
          <span className="material-symbols-outlined !text-[28px]" aria-hidden>schedule</span>
          <div className="min-w-0 flex-1">
            <strong className="font-semibold">Menunggu pembayaran</strong>
            <p className="mt-1 text-xs leading-[18px] opacity-90">
              Sisa waktu: <span className="font-mono font-semibold tabular-nums">{formatRemaining(remaining)}</span>. Jika tidak dibayar, pesanan dibatalkan otomatis.
            </p>
            {payError && <p className="mt-2 text-xs text-error">{payError}</p>}
            {paymentFailed && !payError && (
              <p className="mt-2 text-xs text-error">Pesanan dibuat, tetapi halaman pembayaran belum siap. Tekan tombol bayar untuk mencoba lagi.</p>
            )}
          </div>
          {o.payment_url ? (
            <a className={`${btnPrimary} w-full sm:w-auto`} href={o.payment_url}>Bayar sekarang</a>
          ) : (
            <button
              type="button"
              className={`${btnPrimary} w-full sm:w-auto`}
              disabled={pay.isPending}
              onClick={() => pay.mutate()}
            >
              {pay.isPending && (
                <span className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden />
              )}
              {pay.isPending ? 'Memproses…' : 'Bayar sekarang'}
            </button>
          )}
        </div>
      )}

      {/* Dokumen pertanggungjawaban: faktur, surat pesanan, surat jalan, BAST */}
      <div className={`${card} print:hidden mt-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-lg font-semibold leading-7 text-ink">Dokumen pertanggungjawaban</h2>
        </div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          <DocRow icon="receipt_long" title="Invoice">
            <Link to={`/orders/${o.id}/invoice`} className={btnOutline}>
              <span className="material-symbols-outlined !text-[18px]" aria-hidden>download</span>
              Lihat & cetak invoice
            </Link>
          </DocRow>
          <DocRow icon="description" title="Surat pesanan">
            <Link to={`/orders/${o.id}/surat-pesanan`} className={btnOutline}>
              <span className="material-symbols-outlined !text-[18px]" aria-hidden>download</span>
              Surat pesanan
            </Link>
          </DocRow>
          <DocRow icon="local_shipping" title="Dokumen pengiriman barang">
            {dispatched ? (
              <Link to={`/orders/${o.id}/surat-jalan`} className={btnOutline}>
                <span className="material-symbols-outlined !text-[18px]" aria-hidden>download</span>
                Surat jalan
              </Link>
            ) : (
              <span className="text-xs text-muted">Tersedia setelah dikirim</span>
            )}
          </DocRow>
          <DocRow icon="fact_check" title="Berita acara serah terima (BAST)">
            {dispatched ? (
              <Link to={`/orders/${o.id}/bast`} className={btnOutline}>
                <span className="material-symbols-outlined !text-[18px]" aria-hidden>download</span>
                BAST
              </Link>
            ) : (
              <span className="text-xs text-muted">Tersedia setelah dikirim</span>
            )}
          </DocRow>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Pelacakan pengiriman dan progres pesanan */}
          <div className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined grid size-10 place-items-center rounded-pill bg-primary-container text-[20px] text-on-primary" aria-hidden>local_shipping</span>
                <div>
                  <h2 className="m-0 font-display text-lg font-semibold leading-7 text-ink">Status pelacakan pengiriman</h2>
                </div>
              </div>
              {o.courier && (
                <span className="inline-flex h-7 items-center rounded-pill bg-accent-soft px-3 text-xs font-semibold text-on-accent-soft">{o.courier}</span>
              )}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 rounded-field border border-dashed border-outline bg-surface-low p-3.5 sm:grid-cols-3">
              <div>
                <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Ekspedisi</p>
                <p className="m-0 mt-0.5 text-sm font-semibold text-ink">
                  {o.courier ?? 'Belum ditetapkan'}{o.courier_service ? ` ${o.courier_service}` : ''}
                </p>
              </div>
            </div>

            {o.estimated_days && (o.status === 'processing' || o.status === 'shipped' || o.status === 'completed') && (
              <p className={calloutInfo}>
                Estimasi pengiriman: <strong>{o.estimated_days} hari</strong> sejak pesanan diproses.
                {o.estimated_due_at && o.status === 'processing' && <> Perkiraan selesai {formatDate(o.estimated_due_at)} ({sisaWaktu(o.estimated_due_at)}).</>}
              </p>
            )}
            {o.tracking_number && (
              <p className={calloutInfo}>Nomor resi pengiriman: <strong className="font-mono tabular-nums">{o.tracking_number}</strong></p>
            )}

            {!cancelled && (
              <>
                <h2 className="mt-5 mb-3 font-display text-lg font-semibold leading-7 text-ink">Progres pesanan</h2>
                <ol className="m-0 flex list-none flex-col p-0">
                  {TIMELINE.map((step, i) => {
                    const done = currentStep >= i;
                    const active = currentStep === i;
                    return (
                      <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
                        {i < TIMELINE.length - 1 && (
                          <span
                            aria-hidden
                            className={`absolute top-6 bottom-0 left-[11px] w-0.5 ${currentStep > i ? 'bg-primary' : 'bg-outline-soft'}`}
                          />
                        )}
                        <span
                          aria-hidden
                          className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-pill border-2 ${
                            done ? 'border-primary bg-primary text-on-primary' : 'border-outline bg-surface text-muted'
                          } ${active ? 'ring-4 ring-primary/20' : ''}`}
                        >
                          {done && <span className="material-symbols-outlined !text-[14px]">check</span>}
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className={`m-0 text-sm ${done ? 'font-semibold text-ink' : 'text-muted'}`}>{ORDER_STATUS_LABEL[step]}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>

          {/* Toko dan barang */}
          <div className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-soft pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="material-symbols-outlined grid size-10 shrink-0 place-items-center rounded-pill bg-primary-container text-[20px] text-on-primary" aria-hidden>storefront</span>
                <div className="min-w-0">
                  <p className="m-0 font-display text-[15px] font-semibold text-ink">{o.store_name ?? 'Toko'}</p>
                  {/* DEMO */}
                  <p className="m-0 text-xs text-muted">{o.store_address ?? 'Kota toko'} · NPWP toko: <span className="font-mono">{o.store_npwp ?? '-'}</span></p>
                </div>
              </div>
              {/* DEMO */}
              <span className="inline-flex h-11 items-center text-sm font-semibold text-primary">Kunjungi toko</span>
            </div>

            <h2 className={cardTitle}>Barang</h2>
            <ul className="m-0 list-none p-0">
              {o.items.map((i) => (
                <li key={i.product_id} className="flex justify-between gap-3 border-b border-outline-soft py-3.5 last:border-b-0 last:pb-0">
                  <div className="flex min-w-0 gap-3">
                    {/* DEMO: API pesanan belum menyertakan gambar item, placeholder dipakai */}
                    <ProductImage name={i.product_name} src={null} className="size-16 shrink-0 rounded-field border border-outline-soft sm:size-20" />
                    <div className="min-w-0">
                      <strong className="font-semibold text-ink">{i.product_name}</strong>
                      <p className="mt-1 text-xs leading-[18px] text-muted">
                        {i.qty} × <span className="font-mono tabular-nums">{rp(i.unit_price)}</span> {i.is_taxable ? '(termasuk PPN)' : '(tidak kena PPN)'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono font-semibold tabular-nums text-ink">{rp(i.line_subtotal)}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pengiriman */}
          <div className={card}>
            <h2 className={cardTitle}>Pengiriman</h2>
            {(o.courier || o.destination_label) && (
              <div className="mb-3 grid grid-cols-1 gap-3 rounded-field border border-dashed border-outline bg-surface-low p-3.5 sm:grid-cols-2">
                {o.courier && (
                  <div>
                    <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Ekspedisi</p>
                    <p className="m-0 mt-0.5 text-sm font-semibold text-ink">
                      {o.courier}{o.courier_service ? ` ${o.courier_service}` : ''}
                    </p>
                  </div>
                )}
                {o.destination_label && (
                  <div>
                    <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Tujuan</p>
                    <p className="m-0 mt-0.5 text-sm font-semibold text-ink">{o.destination_label}</p>
                  </div>
                )}
              </div>
            )}
            <p className="my-1 mb-3 whitespace-pre-wrap text-sm text-ink-2">{o.shipping_address}</p>
            {o.buyer_npwp && <p className="text-xs text-muted">NPWP: <span className="font-mono tabular-nums">{o.buyer_npwp}</span></p>}
            {o.promo_code && <p className="text-xs text-muted">Kode promo: <span className="font-mono">{o.promo_code}</span></p>}

          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
          <aside className={card}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="m-0 font-display text-lg font-semibold leading-7 text-ink">Rincian</h2>
              {payment && (
                <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold ${payment.tone}`}>
                  {payment.text}
                </span>
              )}
            </div>
            <Breakdown data={{ ...o, ppn: o.ppn_total }} />
            <p className="mt-4 text-xs leading-[18px] text-muted">PPN {percent(o.ppn_rate)} dihitung atas DPP. Ongkos kirim tidak kena PPN.</p>
          </aside>

          {/* DEMO: kartu bantuan LPJ, tombol belum berfungsi */}
          <div className={card}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined grid size-10 shrink-0 place-items-center rounded-pill bg-accent-soft text-[20px] text-on-accent-soft" aria-hidden>support_agent</span>
              <div className="min-w-0">
                <h2 className="m-0 font-display text-base font-semibold text-ink">{DEMO_LPJ.title}</h2>
                <p className="m-0 mt-1 text-xs leading-[18px] text-muted">{DEMO_LPJ.body}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <button type="button" disabled className={`${btnBase} w-full border-primary-container bg-primary-container text-on-primary disabled:opacity-100`}>{DEMO_LPJ.consult}</button>
              <button type="button" disabled className={`${btnBase} w-full border-error-soft bg-error-soft text-on-error-soft disabled:opacity-100`}>{DEMO_LPJ.complaint}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Satu baris dokumen: ikon, judul, dan tombol unduh. */
function DocRow({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-outline-soft bg-surface-low p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="material-symbols-outlined grid size-9 shrink-0 place-items-center rounded-pill bg-surface text-[18px] text-primary" aria-hidden>{icon}</span>
        <p className="m-0 text-sm font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  );
}

/** Waktu sekarang yang diperbarui tiap detik, untuk hitung mundur. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatRemaining(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit ${String(s).padStart(2, '0')} detik`;
}
