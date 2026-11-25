import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
import { ORDER_STATUS_LABEL, formatDate, percent, rp, sisaWaktu } from '../lib/money';
import type { OrderDetail as OrderDetailType } from '../api/types';
import { useSeo } from '../lib/seo';

const btnBase =
  'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-field border px-4 text-sm font-semibold no-underline transition-[background-color,border-color,color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45';
const btnPrimary = `${btnBase} border-primary bg-primary text-on-primary hover:brightness-110 active:opacity-85`;
const btnOutline = `${btnBase} h-[34px] border-outline bg-surface px-3 text-[13px] text-ink hover:border-primary`;
const calloutInfo = 'my-3 rounded-field bg-secondary-container px-4 py-3 text-sm text-on-secondary-container';
const alertError = 'my-3 rounded-field bg-error-soft px-4 py-3 text-sm text-on-error-soft';
const alertSuccess = 'my-3 rounded-field bg-success-soft px-4 py-3 text-sm text-on-success-soft';
const card = 'rounded-card border border-outline-soft bg-surface p-5 sm:p-6';

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
      <section role="status" aria-busy="true" className="flex flex-col gap-5">
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

  return (
    <section>
      <Link to="/orders" className="text-sm text-muted transition-colors hover:text-primary">← Semua pesanan</Link>

      <div className="mt-3 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mb-1 break-all text-2xl font-bold sm:text-[32px]">{o.invoice_no}</h1>
          <p className="text-xs leading-[18px] text-muted">{formatDate(o.created_at)}</p>
        </div>
        <span
          className={`inline-flex h-8 items-center rounded-pill px-3.5 text-sm font-semibold ${
            cancelled ? 'bg-error-soft text-on-error-soft' : 'bg-surface-high text-ink-2'
          }`}
        >
          {ORDER_STATUS_LABEL[o.status] ?? o.status}
        </span>
      </div>

      <div className="print:hidden mb-2 flex flex-wrap gap-2">
        <Link to={`/orders/${o.id}/invoice`} className={btnOutline}>Lihat & cetak invoice</Link>
        <Link to={`/orders/${o.id}/surat-pesanan`} className={btnOutline}>Surat pesanan</Link>
      </div>

      {o.estimated_days && (o.status === 'processing' || o.status === 'shipped' || o.status === 'completed') && (
        <p className={calloutInfo}>
          Estimasi pengiriman: <strong>{o.estimated_days} hari</strong> sejak pesanan diproses.
          {o.estimated_due_at && o.status === 'processing' && <> Perkiraan selesai {formatDate(o.estimated_due_at)} ({sisaWaktu(o.estimated_due_at)}).</>}
        </p>
      )}
      {o.tracking_number && (
        <p className={calloutInfo}>Nomor resi pengiriman: <strong>{o.tracking_number}</strong></p>
      )}
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
        <div className="my-5 flex flex-wrap items-center gap-4 rounded-card border border-outline-soft bg-surface-low p-5 sm:gap-[18px] sm:px-6">
          <div className="min-w-0 flex-1">
            <strong className="font-semibold">Menunggu pembayaran</strong>
            <p className="mt-1 text-xs leading-[18px] text-muted">
              Sisa waktu: {formatRemaining(remaining)}. Jika tidak dibayar, pesanan dibatalkan otomatis.
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

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={card}>
          <h2 className="mt-0 mb-3 text-lg font-semibold sm:text-xl">Barang</h2>
          <ul className="m-0 list-none p-0">
            {o.items.map((i) => (
              <li key={i.product_id} className="flex justify-between gap-3 border-b border-outline-soft py-3.5 last:border-b-0">
                <div className="min-w-0">
                  <strong className="font-semibold">{i.product_name}</strong>
                  <p className="mt-1 text-xs leading-[18px] text-muted">
                    {i.qty} × {rp(i.unit_price)} {i.is_taxable ? '(termasuk PPN)' : '(tidak kena PPN)'}
                  </p>
                </div>
                <div className="shrink-0 font-semibold tabular-nums">{rp(i.line_subtotal)}</div>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 mb-2 text-lg font-semibold sm:text-xl">Pengiriman</h2>
          <p className="my-1 mb-3 whitespace-pre-wrap text-sm text-ink-2">{o.shipping_address}</p>
          {o.buyer_npwp && <p className="text-xs text-muted">NPWP: {o.buyer_npwp}</p>}
          {o.promo_code && <p className="text-xs text-muted">Kode promo: {o.promo_code}</p>}
        </div>

        <aside className={`${card} lg:sticky lg:top-24`}>
          <h2 className="mt-0 mb-4 text-lg font-semibold sm:text-xl">Rincian</h2>
          <Breakdown data={{ ...o, ppn: o.ppn_total }} />
          <p className="mt-4 text-xs leading-[18px] text-muted">PPN {percent(o.ppn_rate)} dihitung atas DPP. Ongkos kirim tidak kena PPN.</p>
        </aside>
      </div>
    </section>
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
