import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocToolbar, MiniLabel, Paper, SignatureBox, StoreBlock, docDate } from '../components/docs/shared';
import { ORDER_STATUS_LABEL, percent, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Faktur pajak: dokumen bukti bayar. Menampilkan DPP, PPN, dan status lunas. Identitas warna: navy. */
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
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#e4e3ee] pb-6">
          <div>
            <h1 className="m-0 font-display text-[36px] font-bold leading-none tracking-tight text-[#00288e] sm:text-[40px]">INVOICE</h1>
            <p className="mt-3 font-mono text-sm font-semibold">{o.invoice_no}</p>
            <p className="m-0 text-xs text-[#5b5e6e]">Tanggal: {docDate(o.created_at)}</p>
            <p className="m-0 text-xs text-[#5b5e6e]">Status pesanan: {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
          </div>
          <StoreBlock order={o} />
        </header>

        <div className="mt-6 grid gap-5 rounded-field bg-[#eff4ff] p-4 sm:grid-cols-2">
          <div>
            <h2 className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#00288e]">Ditagihkan kepada</h2>
            <p className="m-0 mt-1 font-display font-bold">{o.buyer_name ?? '-'}</p>
            <p className="m-0 whitespace-pre-line text-sm">{o.shipping_address}</p>
            {o.buyer_npwp && <p className="m-0 font-mono text-sm">NPWP: {o.buyer_npwp}</p>}
          </div>
          <div className="text-sm">
            <h2 className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#00288e]">Pembayaran</h2>
            <p className="m-0 mt-1">{paid ? 'Lunas melalui Midtrans' : refunded ? 'Dibatalkan, dana dikembalikan' : 'Belum dibayar'}</p>
          </div>
        </div>

        <table className="mt-8 hidden w-full border-collapse text-sm sm:table print:table">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider [&_th]:bg-[#00288e] [&_th]:text-white">
              <th className="px-3 py-2.5 font-bold">Barang</th>
              <th className="px-3 py-2.5 text-right font-bold">Qty</th>
              <th className="px-3 py-2.5 text-right font-bold">Harga (termasuk PPN)</th>
              <th className="px-3 py-2.5 text-right font-bold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-[#e4e3ee] align-top print:break-inside-avoid">
                <td className="px-3 py-2.5">
                  {i.product_name}
                  {!i.is_taxable && <span className="text-xs text-[#5b5e6e]"> (tidak kena PPN)</span>}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{i.qty}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{rp(i.unit_price)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="m-0 mt-6 flex list-none flex-col gap-2.5 p-0 sm:hidden print:hidden">
          {o.items.map((i) => (
            <li key={i.id} className="rounded-field border border-[#e4e3ee] p-3 text-sm">
              <p className="m-0 font-semibold">
                {i.product_name}
                {!i.is_taxable && <span className="text-xs font-normal text-[#5b5e6e]"> (tidak kena PPN)</span>}
              </p>
              <dl className="m-0 mt-2 grid grid-cols-3 gap-2 text-right">
                <div>
                  <dt><MiniLabel>Qty</MiniLabel></dt>
                  <dd className="m-0 font-mono tabular-nums">{i.qty}</dd>
                </div>
                <div>
                  <dt><MiniLabel>Harga (termasuk PPN)</MiniLabel></dt>
                  <dd className="m-0 font-mono tabular-nums">{rp(i.unit_price)}</dd>
                </div>
                <div>
                  <dt><MiniLabel>Jumlah</MiniLabel></dt>
                  <dd className="m-0 font-mono font-semibold tabular-nums">{rp(i.line_subtotal)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className="mt-6 ml-auto max-w-sm text-sm">
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
            <dt>Subtotal</dt>
            <dd className="m-0 text-right font-mono tabular-nums">{rp(o.subtotal)}</dd>
            {Number(o.discount_total) > 0 && (
              <>
                <dt>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt>
                <dd className="m-0 text-right font-mono tabular-nums">−{rp(o.discount_total)}</dd>
              </>
            )}
            {Number(o.dpp) > 0 && (
              <>
                <dt className="text-[#5b5e6e]">DPP (dasar pengenaan pajak)</dt>
                <dd className="m-0 text-right font-mono tabular-nums">{rp(o.dpp)}</dd>
                <dt className="text-[#5b5e6e]">PPN {percent(o.ppn_rate)}</dt>
                <dd className="m-0 text-right font-mono tabular-nums">{rp(o.ppn_total)}</dd>
              </>
            )}
            <dt>Ongkos kirim (tidak kena PPN)</dt>
            <dd className="m-0 text-right font-mono tabular-nums">{rp(o.shipping_fee)}</dd>
          </dl>
          <div className="mt-3 flex items-center justify-between gap-4 rounded-field bg-[#00288e] px-4 py-3 text-white">
            <span className="font-display text-base font-bold">Total</span>
            <span className="font-mono text-lg font-bold tabular-nums">{rp(o.grand_total)}</span>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 print:break-inside-avoid">
          {paid ? (
            <span className="inline-block -rotate-6 rounded-field border-[3px] border-[#15803d] px-4 py-1 font-display text-2xl font-bold tracking-wider text-[#15803d]">LUNAS</span>
          ) : (
            <p className="m-0 max-w-xs text-xs text-[#5b5e6e]">Belum dibayar. Selesaikan pembayaran lewat halaman pesanan.</p>
          )}
          <div className="w-56">
            <SignatureBox title="Hormat kami" name={o.store_name || 'Penjual'} tone="navy" />
          </div>
        </div>
        <p className="mt-8 border-t border-[#e4e3ee] pt-3 text-[11px] text-[#5b5e6e]">
          Harga sudah termasuk PPN. Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah.
        </p>
      </Paper>
    </section>
  );
}
