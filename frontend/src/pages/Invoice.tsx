import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocToolbar, Paper, SignatureBox, StoreBlock, docDate } from '../components/docs/shared';
import { ORDER_STATUS_LABEL, percent, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Faktur pajak: dokumen bukti bayar. Menampilkan DPP, PPN, dan status lunas. */
export default function Invoice() {
  useSeo({ title: 'Invoice', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['order', orderId], queryFn: () => api.order(orderId) });

  if (order.isPending) return <p className="text-muted">Memuat invoice…</p>;
  if (order.isError || !order.data) return <p className="text-error">Invoice tidak ditemukan.</p>;
  const o = order.data;
  const paid = o.payment_status === 'paid';
  const refunded = o.payment_status === 'refunded';

  return (
    <section>
      <DocToolbar orderId={o.id} active="invoice" />
      <Paper accent="#00288e">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="m-0 font-display text-[40px] font-bold leading-none tracking-tight text-[#00288e]">INVOICE</h1>
            <p className="mt-3 font-mono text-sm">{o.invoice_no}</p>
            <p className="m-0 text-xs text-[#5b5e6e]">Tanggal: {docDate(o.created_at)}</p>
            <p className="m-0 text-xs text-[#5b5e6e]">Status pesanan: {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
          </div>
          <StoreBlock order={o} />
        </header>

        <div className="mt-8 grid gap-6 border-t border-[#e4e3ee] pt-6 sm:grid-cols-2">
          <div>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#5b5e6e]">Ditagihkan kepada</p>
            <p className="m-0 mt-1 font-semibold">{o.buyer_name ?? '-'}</p>
            <p className="m-0 whitespace-pre-line text-sm">{o.shipping_address}</p>
            {o.buyer_npwp && <p className="m-0 text-sm">NPWP: {o.buyer_npwp}</p>}
          </div>
          <div className="text-sm">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#5b5e6e]">Pembayaran</p>
            <p className="m-0 mt-1">{paid ? 'Lunas melalui Midtrans' : refunded ? 'Dibatalkan, dana dikembalikan' : 'Belum dibayar'}</p>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#00288e] text-left text-[11px] uppercase tracking-wider text-[#5b5e6e]">
              <th className="py-2 pr-2">Barang</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Harga (termasuk PPN)</th>
              <th className="py-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-[#e4e3ee] align-top">
                <td className="py-2.5 pr-2">
                  {i.product_name}
                  {!i.is_taxable && <span className="text-xs text-[#5b5e6e]"> (tidak kena PPN)</span>}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{i.qty}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{rp(i.unit_price)}</td>
                <td className="py-2.5 text-right tabular-nums">{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-sm text-sm">
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 tabular-nums">
            <dt>Subtotal</dt>
            <dd className="m-0 text-right">{rp(o.subtotal)}</dd>
            {Number(o.discount_total) > 0 && (
              <>
                <dt>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt>
                <dd className="m-0 text-right">−{rp(o.discount_total)}</dd>
              </>
            )}
            {Number(o.dpp) > 0 && (
              <>
                <dt className="text-[#5b5e6e]">DPP (dasar pengenaan pajak)</dt>
                <dd className="m-0 text-right">{rp(o.dpp)}</dd>
                <dt className="text-[#5b5e6e]">PPN {percent(o.ppn_rate)}</dt>
                <dd className="m-0 text-right">{rp(o.ppn_total)}</dd>
              </>
            )}
            <dt>Ongkos kirim (tidak kena PPN)</dt>
            <dd className="m-0 text-right">{rp(o.shipping_fee)}</dd>
            <dt className="border-t-2 border-[#1a1b22] pt-2 text-base font-bold">Total</dt>
            <dd className="m-0 border-t-2 border-[#1a1b22] pt-2 text-right text-base font-bold">{rp(o.grand_total)}</dd>
          </dl>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          {paid ? (
            <span className="inline-block -rotate-6 rounded-md border-[3px] border-[#15803d] px-4 py-1 font-display text-2xl font-bold tracking-wider text-[#15803d]">LUNAS</span>
          ) : (
            <p className="m-0 max-w-xs text-xs text-[#5b5e6e]">Belum dibayar. Selesaikan pembayaran lewat halaman pesanan.</p>
          )}
          <div className="w-56">
            <SignatureBox title="Hormat kami" name={o.store_name || 'Penjual'} />
          </div>
        </div>
        <p className="mt-8 border-t border-[#e4e3ee] pt-3 text-[11px] text-[#5b5e6e]">
          Harga sudah termasuk PPN. Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah.
        </p>
      </Paper>
    </section>
  );
}
