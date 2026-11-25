import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ORDER_STATUS_LABEL, formatDate, percent, rp, sisaWaktu } from '../../lib/money';
import { useSeo } from '../../lib/seo';

const ACTION_LABEL: Record<string, string> = {
  'order.status': 'Ubah status',
  'order.refund_cancel': 'Batalkan + catat refund',
};

/** Detail satu pesanan untuk admin: ringkasan biaya, pembeli, pengiriman, barang, dan riwayat aktivitas. */
export default function AdminOrderDetail() {
  useSeo({ title: 'Detail pesanan', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['admin-order', orderId], queryFn: () => api.adminOrder(orderId) });
  const activity = useQuery({ queryKey: ['admin-order-activity', orderId], queryFn: () => api.adminOrderActivity(orderId) });

  if (order.isPending) return <p className="muted">Memuat pesanan…</p>;
  if (order.isError || !order.data) {
    return (
      <section>
        <Link to="/admin/orders" className="muted small">← Semua pesanan</Link>
        <p className="error">Pesanan tidak ditemukan.</p>
      </section>
    );
  }

  const o = order.data;
  const discount = Number(o.discount_total) > 0;
  const hasDpp = Number(o.dpp) > 0;

  return (
    <section>
      <Link to="/admin/orders" className="muted small">← Semua pesanan</Link>
      <PageHeader
        title={o.invoice_no}
        subtitle={`Dibuat ${formatDate(o.created_at)}`}
        actions={<span className={`tag big ${o.status === 'cancelled' ? 'danger' : ''}`}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>}
      />

      <div className="detail-cards">
        <div className="card detail-card">
          <h2>Ringkasan biaya</h2>
          <dl className="kv">
            <div><dt>Subtotal</dt><dd>{rp(o.subtotal)}</dd></div>
            {discount && <div><dt>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt><dd>−{rp(o.discount_total)}</dd></div>}
            {hasDpp && <div><dt>DPP</dt><dd>{rp(o.dpp)}</dd></div>}
            {hasDpp && <div><dt>PPN {percent(o.ppn_rate)}</dt><dd>{rp(o.ppn_total)}</dd></div>}
            <div><dt>Ongkos kirim (tanpa PPN)</dt><dd>{rp(o.shipping_fee)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{rp(o.grand_total)}</dd></div>
          </dl>
        </div>

        <div className="card detail-card">
          <h2>Pembayaran dan pembeli</h2>
          <dl className="kv">
            <div><dt>Status pembayaran</dt><dd>{o.payment_status}</dd></div>
            <div><dt>Pembeli</dt><dd>{o.buyer_name ?? '-'}</dd></div>
            <div><dt>NPWP pembeli</dt><dd>{o.buyer_npwp ?? '-'}</dd></div>
            <div><dt>Alamat</dt><dd className="pre">{o.shipping_address}</dd></div>
          </dl>
        </div>

        <div className="card detail-card">
          <h2>Pengiriman</h2>
          <dl className="kv">
            <div><dt>Nomor resi</dt><dd>{o.tracking_number ?? 'Belum diisi'}</dd></div>
            <div><dt>Estimasi</dt><dd>{o.estimated_days ? `${o.estimated_days} hari` : 'Belum diisi'}</dd></div>
            {o.estimated_due_at && (
              <div><dt>Tenggat</dt><dd>{formatDate(o.estimated_due_at)} · {sisaWaktu(o.estimated_due_at)}</dd></div>
            )}
          </dl>
          {o.refund_note && <p className="callout-info">Catatan refund: {o.refund_note}</p>}
        </div>
      </div>

      <div className="card table-wrap detail-items">
        <h2>Barang</h2>
        <table>
          <thead>
            <tr><th>Produk</th><th className="num">Qty</th><th className="num">Harga (termasuk PPN)</th><th className="num">Jumlah</th></tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={`${i.product_id}-${i.product_name}`}>
                <td>
                  {i.product_name}
                  {!i.is_taxable && <span className="muted small"> (tanpa PPN)</span>}
                </td>
                <td className="num">{i.qty}</td>
                <td className="num">{rp(i.unit_price)}</td>
                <td className="num">{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card detail-card">
        <h2>Riwayat aktivitas</h2>
        {activity.data && activity.data.length > 0 ? (
          <ul className="timeline">
            {activity.data.map((e) => (
              <li key={e.id}>
                <strong>{ACTION_LABEL[e.action] ?? e.action}</strong>
                <span className="muted small"> · {e.actor_name ?? 'Sistem'} · {formatDate(e.created_at)}</span>
                <div className="small">{e.detail}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Belum ada aktivitas tercatat.</p>
        )}
      </div>
    </section>
  );
}
