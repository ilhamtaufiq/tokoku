import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ORDER_STATUS_LABEL, formatDate, percent, rp } from '../lib/money';

/** Invoice yang bisa dicetak atau disimpan sebagai PDF lewat dialog cetak browser. */
export default function Invoice() {
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['order', orderId], queryFn: () => api.order(orderId) });
  const store = useQuery({ queryKey: ['store'], queryFn: api.store });

  if (order.isPending) return <p className="muted">Memuat invoice…</p>;
  if (order.isError || !order.data) return <p className="error">Invoice tidak ditemukan.</p>;

  const o = order.data;
  const s = store.data;
  const unpaid = o.payment_status !== 'paid' && o.payment_status !== 'refunded';

  return (
    <section className="invoice-page">
      <div className="invoice-actions no-print">
        <Link to={`/orders/${o.id}`} className="btn ghost small-btn">← Kembali ke pesanan</Link>
        <button className="btn primary small-btn" onClick={() => window.print()}>Cetak / Simpan PDF</button>
      </div>

      <article className="invoice">
        <header className="invoice-head">
          <div>
            <h1 className="invoice-title">INVOICE</h1>
            <p className="invoice-no">{o.invoice_no}</p>
            <p className="muted small">Tanggal: {formatDate(o.created_at)}</p>
            <p className="muted small">Status: {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
          </div>
          <div className="store-block">
            <strong>{s?.name || 'Nama toko belum diatur'}</strong>
            {s?.npwp && <p className="small">NPWP: {formatNpwp(s.npwp)}</p>}
            {s?.address && <p className="small">{s.address}</p>}
            {s?.phone && <p className="small">Telp: {s.phone}</p>}
          </div>
        </header>

        <div className="invoice-parties">
          <div>
            <p className="label">Ditagihkan kepada</p>
            <strong>{o.buyer_name ?? '-'}</strong>
            <p className="pre small">{o.shipping_address}</p>
            {o.buyer_npwp && <p className="small">NPWP: {formatNpwp(o.buyer_npwp)}</p>}
          </div>
          {o.tracking_number && (
            <div>
              <p className="label">Pengiriman</p>
              <p className="small">Nomor resi: <strong>{o.tracking_number}</strong></p>
            </div>
          )}
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Barang</th>
              <th className="num">Qty</th>
              <th className="num">Harga (termasuk PPN)</th>
              <th className="num">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.product_id}>
                <td>
                  {i.product_name}
                  {!i.is_taxable && <span className="muted small"> (tidak kena PPN)</span>}
                </td>
                <td className="num">{i.qty}</td>
                <td className="num">{rp(i.unit_price)}</td>
                <td className="num">{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <dl>
            <div><dt>Subtotal</dt><dd>{rp(o.subtotal)}</dd></div>
            {Number(o.discount_total) > 0 && (
              <div><dt>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt><dd>−{rp(o.discount_total)}</dd></div>
            )}
            {Number(o.dpp) > 0 && (
              <>
                <div className="sub"><dt>DPP (dasar pengenaan pajak)</dt><dd>{rp(o.dpp)}</dd></div>
                <div className="sub"><dt>PPN {percent(o.ppn_rate)}</dt><dd>{rp(o.ppn_total)}</dd></div>
              </>
            )}
            <div><dt>Ongkos kirim (tidak kena PPN)</dt><dd>{rp(o.shipping_fee)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{rp(o.grand_total)}</dd></div>
          </dl>
        </div>

        <footer className="invoice-foot">
          {o.payment_status === 'paid' && <p className="small"><strong>LUNAS</strong> · dibayar melalui Midtrans</p>}
          {unpaid && <p className="small">Belum dibayar. Batas pembayaran sesuai halaman pesanan.</p>}
          {o.payment_status === 'refunded' && <p className="small">Pesanan dibatalkan. Dana dikembalikan kepada pembeli.</p>}
          <p className="muted small">Harga sudah termasuk PPN. Dokumen ini dibuat secara elektronik.</p>
        </footer>
      </article>
    </section>
  );
}

function formatNpwp(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 15) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12)}`;
  return raw;
}
