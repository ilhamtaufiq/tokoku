import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { ORDER_STATUS_LABEL, formatDate, percent, rp, sisaWaktu } from '../../lib/money';
import { useSeo } from '../../lib/seo';
import { CARD, MONEY, MUTED_SMALL, Notice, StatusBadge, TABLE_STACK, TABLE_WRAP, TBODY, TD, TD_MONEY, TD_NUM, TH, TH_NUM, cx } from './adminUi';

const ACTION_LABEL: Record<string, string> = {
  'order.status': 'Ubah status',
  'order.refund_cancel': 'Batalkan + catat refund',
};

const BACK_LINK = 'inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted no-underline hover:text-primary md:min-h-0';
const CARD_TITLE = 'm-0 mb-1 text-base font-semibold text-ink';
/** Baris ringkasan: label di kiri, nilai di kanan. */
const KV = 'm-0 flex min-w-0 flex-col gap-2';
const KV_ROW = 'flex min-w-0 justify-between gap-3 text-sm';
const KV_KEY = 'text-muted';
const KV_VAL = 'm-0 min-w-0 break-words text-right text-ink';
const KV_MONEY = cx(KV_VAL, 'whitespace-nowrap', MONEY);

/** Detail satu pesanan untuk admin: ringkasan biaya, pembeli, pengiriman, barang, dan riwayat aktivitas. */
export default function AdminOrderDetail() {
  useSeo({ title: 'Detail pesanan', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['admin-order', orderId], queryFn: () => api.adminOrder(orderId) });
  const activity = useQuery({ queryKey: ['admin-order-activity', orderId], queryFn: () => api.adminOrderActivity(orderId) });

  if (order.isPending) return <p className="text-muted">Memuat pesanan…</p>;
  if (order.isError || !order.data) {
    return (
      <section>
        <Link to="/admin/orders" className={BACK_LINK}>← Semua pesanan</Link>
        <div className="mt-3"><Notice kind="error">Pesanan tidak ditemukan.</Notice></div>
      </section>
    );
  }

  const o = order.data;
  const discount = Number(o.discount_total) > 0;
  const hasDpp = Number(o.dpp) > 0;

  return (
    <section className="flex flex-col gap-4">
      <Link to="/admin/orders" className={BACK_LINK}>← Semua pesanan</Link>
      <div className="mb-2 print:hidden"><Link to={`/orders/${orderId}/bast`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary md:min-h-0">Lihat BAST</Link></div>
      <PageHeader
        title={o.invoice_no}
        subtitle={`Dibuat ${formatDate(o.created_at)}`}
        actions={
          <StatusBadge tone={o.status === 'cancelled' ? 'danger' : 'neutral'} className="h-8 px-3.5 text-sm">
            {ORDER_STATUS_LABEL[o.status] ?? o.status}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className={cx(CARD, 'flex min-w-0 flex-col gap-2.5 p-4 sm:p-5')}>
          <h2 className={CARD_TITLE}>Ringkasan biaya</h2>
          <dl className={KV}>
            <div className={KV_ROW}><dt className={KV_KEY}>Subtotal</dt><dd className={KV_MONEY}>{rp(o.subtotal)}</dd></div>
            {discount && <div className={KV_ROW}><dt className={KV_KEY}>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt><dd className={KV_MONEY}>−{rp(o.discount_total)}</dd></div>}
            {hasDpp && <div className={KV_ROW}><dt className={KV_KEY}>DPP</dt><dd className={KV_MONEY}>{rp(o.dpp)}</dd></div>}
            {hasDpp && <div className={KV_ROW}><dt className={KV_KEY}>PPN {percent(o.ppn_rate)}</dt><dd className={KV_MONEY}>{rp(o.ppn_total)}</dd></div>}
            <div className={KV_ROW}><dt className={KV_KEY}>Ongkos kirim (tanpa PPN)</dt><dd className={KV_MONEY}>{rp(o.shipping_fee)}</dd></div>
            <div className={cx(KV_ROW, 'border-t border-outline-soft pt-2 font-bold')}><dt>Total</dt><dd className={KV_MONEY}>{rp(o.grand_total)}</dd></div>
          </dl>
        </div>

        <div className={cx(CARD, 'flex min-w-0 flex-col gap-2.5 p-4 sm:p-5')}>
          <h2 className={CARD_TITLE}>Pembayaran dan pembeli</h2>
          <dl className={KV}>
            <div className={KV_ROW}><dt className={KV_KEY}>Status pembayaran</dt><dd className={KV_VAL}>{o.payment_status}</dd></div>
            <div className={KV_ROW}><dt className={KV_KEY}>Pembeli</dt><dd className={KV_VAL}>{o.buyer_name ?? '-'}</dd></div>
            <div className={KV_ROW}><dt className={KV_KEY}>NPWP pembeli</dt><dd className={KV_VAL}>{o.buyer_npwp ?? '-'}</dd></div>
            <div className={KV_ROW}><dt className={KV_KEY}>Alamat</dt><dd className={cx(KV_VAL, 'whitespace-pre-wrap')}>{o.shipping_address}</dd></div>
          </dl>
        </div>

        <div className={cx(CARD, 'flex min-w-0 flex-col gap-2.5 p-4 sm:p-5')}>
          <h2 className={CARD_TITLE}>Pengiriman</h2>
          <dl className={KV}>
            <div className={KV_ROW}><dt className={KV_KEY}>Nomor resi</dt><dd className={KV_VAL}>{o.tracking_number ?? 'Belum diisi'}</dd></div>
            <div className={KV_ROW}><dt className={KV_KEY}>Estimasi</dt><dd className={KV_VAL}>{o.estimated_days ? `${o.estimated_days} hari` : 'Belum diisi'}</dd></div>
            {o.estimated_due_at && (
              <div className={KV_ROW}><dt className={KV_KEY}>Tenggat</dt><dd className={KV_VAL}>{formatDate(o.estimated_due_at)} · {sisaWaktu(o.estimated_due_at)}</dd></div>
            )}
          </dl>
          {o.refund_note && (
            <p className="rounded-field bg-secondary-container px-3 py-2.5 text-sm text-on-secondary-container">Catatan refund: {o.refund_note}</p>
          )}
        </div>
      </div>

      <div className={cx(TABLE_WRAP, 'overflow-x-auto')}>
        <h2 className="px-4 pb-2 pt-4 text-base font-semibold text-ink sm:px-5">Barang</h2>
        <table className={TABLE_STACK}>
          <thead>
            <tr>
              <th className={TH}>Produk</th>
              <th className={TH_NUM}>Qty</th>
              <th className={TH_NUM}>Harga (termasuk PPN)</th>
              <th className={TH_NUM}>Jumlah</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {o.items.map((i) => (
              <tr key={`${i.product_id}-${i.product_name}`}>
                <td data-label="" className={cx(TD, 'max-md:block!')}>
                  {i.product_name}
                  {!i.is_taxable && <span className={cx(MUTED_SMALL, 'ml-1')}>(tanpa PPN)</span>}
                </td>
                <td data-label="Qty" className={cx(TD_NUM, MONEY)}>{i.qty}</td>
                <td data-label="Harga" className={TD_MONEY}>{rp(i.unit_price)}</td>
                <td data-label="Jumlah" className={TD_MONEY}>{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cx(CARD, 'flex min-w-0 flex-col gap-2.5 p-4 sm:p-5')}>
        <h2 className={CARD_TITLE}>Riwayat aktivitas</h2>
        {activity.data && activity.data.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {activity.data.map((e) => (
              <li key={e.id} className="border-l-2 border-outline pl-3">
                <strong className="font-semibold text-ink">{ACTION_LABEL[e.action] ?? e.action}</strong>
                <span className={MUTED_SMALL}> · {e.actor_name ?? 'Sistem'} · {formatDate(e.created_at)}</span>
                <div className="text-sm text-ink-2">{e.detail}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={MUTED_SMALL}>Belum ada aktivitas tercatat.</p>
        )}
      </div>
    </section>
  );
}
