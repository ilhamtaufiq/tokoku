import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { Breakdown } from '../components/Breakdown';
import { ORDER_STATUS_LABEL, formatDate, percent, rp } from '../lib/money';
import type { OrderDetail as OrderDetailType } from '../api/types';
import { useSeo } from '../lib/seo';

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

  if (order.isPending) return <p className="muted">Memuat pesanan…</p>;
  if (order.isError || !order.data) return <p className="error">Pesanan tidak ditemukan.</p>;

  const o = order.data;
  const waiting = o.status === 'pending_payment' && o.payment_status === 'unpaid';
  const remaining = Math.max(0, o.expires_in_seconds - Math.floor((now - order.dataUpdatedAt) / 1000));
  const paymentFailed = (location.state as { paymentFailed?: boolean } | null)?.paymentFailed;

  return (
    <section>
      <Link to="/orders" className="muted small">← Semua pesanan</Link>
      <div className="order-head">
        <div>
          <h1>{o.invoice_no}</h1>
          <p className="muted small">{formatDate(o.created_at)}</p>
        </div>
        <span className={`tag big ${o.status === 'cancelled' ? 'danger' : ''}`}>
          {ORDER_STATUS_LABEL[o.status] ?? o.status}
        </span>
      </div>

      <div className="no-print">
        <Link to={`/orders/${o.id}/invoice`} className="btn ghost small-btn">Lihat & cetak invoice</Link>
      </div>

      {o.estimated_days && (o.status === 'processing' || o.status === 'shipped' || o.status === 'completed') && (
        <p className="callout-info">Estimasi pengiriman: <strong>{o.estimated_days} hari</strong> sejak pesanan diproses.</p>
      )}
      {o.tracking_number && (
        <p className="callout-info">Nomor resi pengiriman: <strong>{o.tracking_number}</strong></p>
      )}
      {o.status === 'cancelled' && o.payment_status === 'refunded' && (
        <p className="error">Pesanan dibatalkan dan dana dikembalikan{o.refund_note ? `: ${o.refund_note}` : '.'}</p>
      )}
      {o.payment_status === 'paid' && (
        <p className="success">Pembayaran diterima. Terima kasih, pesananmu sedang kami proses.</p>
      )}
      {o.status === 'cancelled' && (
        o.payment_status !== 'refunded' && <p className="error">Pesanan dibatalkan karena tidak dibayar tepat waktu. Stok sudah dikembalikan.</p>
      )}
      {waiting && (
        <div className="card callout">
          <div className="grow">
            <strong>Menunggu pembayaran</strong>
            <p className="muted small">
              Sisa waktu: {formatRemaining(remaining)}. Jika tidak dibayar, pesanan dibatalkan otomatis.
            </p>
            {payError && <p className="error small">{payError}</p>}
            {paymentFailed && !payError && (
              <p className="error small">Pesanan dibuat, tetapi halaman pembayaran belum siap. Tekan tombol bayar untuk mencoba lagi.</p>
            )}
          </div>
          {o.payment_url ? (
            <a className="btn primary" href={o.payment_url}>Bayar sekarang</a>
          ) : (
            <button className="btn primary" disabled={pay.isPending} onClick={() => pay.mutate()}>
              {pay.isPending ? 'Memproses…' : 'Bayar sekarang'}
            </button>
          )}
        </div>
      )}

      <div className="cart-grid">
        <div className="card">
          <h2>Barang</h2>
          <ul className="items">
            {o.items.map((i) => (
              <li key={i.product_id}>
                <div className="grow">
                  <strong>{i.product_name}</strong>
                  <p className="muted small">
                    {i.qty} × {rp(i.unit_price)} {i.is_taxable ? '(termasuk PPN)' : '(tidak kena PPN)'}
                  </p>
                </div>
                <div>{rp(i.line_subtotal)}</div>
              </li>
            ))}
          </ul>
          <h2>Pengiriman</h2>
          <p className="pre">{o.shipping_address}</p>
          {o.buyer_npwp && <p className="small muted">NPWP: {o.buyer_npwp}</p>}
          {o.promo_code && <p className="small muted">Kode promo: {o.promo_code}</p>}
        </div>

        <aside className="card summary">
          <h2>Rincian</h2>
          <Breakdown data={{ ...o, ppn: o.ppn_total }} />
          <p className="muted small">PPN {percent(o.ppn_rate)} dihitung atas DPP. Ongkos kirim tidak kena PPN.</p>
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

