import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocToolbar, Paper, StoreBlock, docDate } from '../components/docs/shared';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Surat pesanan: dokumen sebelum bayar. Bukan bukti pembayaran, dan tidak merinci PPN. */
export default function PurchaseOrder() {
  useSeo({ title: 'Surat pesanan', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['order', orderId], queryFn: () => api.order(orderId) });

  if (order.isPending) return <p className="text-muted">Memuat surat pesanan…</p>;
  if (order.isError || !order.data) return <p className="text-error">Surat pesanan tidak ditemukan.</p>;
  const o = order.data;
  const unpaid = o.payment_status === 'unpaid';
  const deadline = unpaid ? new Date(Date.now() + o.expires_in_seconds * 1000) : null;
  const totalQty = o.items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <section>
      <DocToolbar orderId={o.id} active="sp" />
      <Paper accent="#ea580c">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ea580c]">Dokumen pemesanan</p>
            <h1 className="mt-1 font-display text-[34px] font-semibold leading-none tracking-tight">Surat Pesanan</h1>
            <p className="mt-3 text-sm">No. pesanan <span className="font-mono">{o.invoice_no}</span></p>
            <p className="m-0 text-xs text-[#5b5e6e]">Dibuat {docDate(o.created_at)}</p>
          </div>
          <StoreBlock order={o} />
        </header>

        <div className="mt-6 rounded-md bg-[#fff7ed] p-4 text-sm text-[#7c2d12]">
          <strong>Ini bukan bukti pembayaran.</strong>{' '}
          {unpaid
            ? deadline && `Bayar sebelum ${docDate(deadline.toISOString())} agar pesanan diproses. Setelah lunas, invoice akan tersedia.`
            : 'Bukti pembayaran tersedia di invoice.'}
        </div>

        <section className="mt-6">
          <h2 className="m-0 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5b5e6e]">Dikirim ke</h2>
          <p className="m-0 font-semibold">{o.buyer_name ?? '-'}</p>
          <p className="m-0 whitespace-pre-line text-sm">{o.shipping_address}</p>
          {o.destination_label && <p className="m-0 text-sm text-[#5b5e6e]">Kecamatan: {o.destination_label}</p>}
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#1a1b22] text-left text-[11px] uppercase tracking-wider text-[#5b5e6e]">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Barang</th>
              <th className="py-2 pr-2 text-right">Jumlah</th>
              <th className="py-2 pr-2 text-right">Harga satuan</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, idx) => (
              <tr key={i.id} className="border-b border-dashed border-[#c4c5d5]">
                <td className="py-2.5 pr-2 text-[#5b5e6e]">{idx + 1}</td>
                <td className="py-2.5 pr-2">{i.product_name}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{i.qty}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{rp(i.unit_price)}</td>
                <td className="py-2.5 text-right tabular-nums">{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-sm space-y-1.5 text-sm tabular-nums">
          <div className="flex justify-between"><span>Total barang ({totalQty} item)</span><span>{rp(o.subtotal)}</span></div>
          {Number(o.discount_total) > 0 && (
            <div className="flex justify-between"><span>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</span><span>−{rp(o.discount_total)}</span></div>
          )}
          <div className="flex justify-between"><span>Ongkos kirim</span><span>{rp(o.shipping_fee)}</span></div>
          <div className="flex justify-between border-t border-[#1a1b22] pt-2 text-base font-bold"><span>Total bayar</span><span>{rp(o.grand_total)}</span></div>
          <p className="m-0 pt-1 text-right text-xs text-[#5b5e6e]">Harga sudah termasuk PPN.</p>
        </div>

        <p className="mt-10 border-t border-[#e4e3ee] pt-3 text-[11px] text-[#5b5e6e]">
          Surat pesanan ini dibuat otomatis dari data pesanan dan tidak memerlukan tanda tangan.
        </p>
      </Paper>
    </section>
  );
}
