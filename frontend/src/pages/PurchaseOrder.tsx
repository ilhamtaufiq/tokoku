import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocToolbar, MiniLabel, Paper, StoreBlock, docDate } from '../components/docs/shared';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Surat pesanan: dokumen sebelum bayar. Bukan bukti pembayaran, dan tidak merinci PPN. Identitas warna: oranye. */
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
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[#fed7aa] pb-6">
          <div>
            <p className="m-0 font-display text-xs font-bold uppercase tracking-[0.2em] text-[#c2410c]">Dokumen pemesanan</p>
            <h1 className="mt-1 font-display text-[30px] font-bold leading-none tracking-tight text-[#1a1b22] sm:text-[34px]">Surat Pesanan</h1>
            <p className="mt-3 text-sm">No. pesanan <span className="font-mono font-semibold">{o.invoice_no}</span></p>
            <p className="m-0 text-xs text-[#5b5e6e]">Dibuat {docDate(o.created_at)}</p>
          </div>
          <StoreBlock order={o} />
        </header>

        <div className="mt-6 flex gap-3 rounded-field border-2 border-[#ea580c] bg-[#fff7ed] p-4 text-sm text-[#7c2d12]" role="note">
          <span className="material-symbols-outlined !text-[22px] text-[#ea580c]" aria-hidden="true">warning</span>
          <p className="m-0">
            <strong className="font-display text-[15px] font-bold uppercase tracking-wide">Ini bukan bukti pembayaran.</strong>{' '}
            {unpaid
              ? deadline && `Bayar sebelum ${docDate(deadline.toISOString())} agar pesanan diproses. Setelah lunas, invoice akan tersedia.`
              : 'Bukti pembayaran tersedia di invoice.'}
          </p>
        </div>

        <section className="mt-6">
          <h2 className="m-0 mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#c2410c]">Dikirim ke</h2>
          <p className="m-0 font-display font-bold">{o.buyer_name ?? '-'}</p>
          <p className="m-0 whitespace-pre-line text-sm">{o.shipping_address}</p>
          {o.destination_label && <p className="m-0 text-sm text-[#5b5e6e]">Kecamatan: {o.destination_label}</p>}
        </section>

        <table className="mt-6 hidden w-full border-collapse text-sm sm:table print:table">
          <thead>
            <tr className="border-b-2 border-[#ea580c] text-left text-[11px] font-bold uppercase tracking-wider [&_th]:bg-[#fff7ed] [&_th]:text-[#9a3412]">
              <th className="px-2 py-2 font-bold">#</th>
              <th className="px-2 py-2 font-bold">Barang</th>
              <th className="px-2 py-2 text-right font-bold">Jumlah</th>
              <th className="px-2 py-2 text-right font-bold">Harga satuan</th>
              <th className="px-2 py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, idx) => (
              <tr key={i.id} className="border-b border-dashed border-[#fdba74] print:break-inside-avoid">
                <td className="px-2 py-2.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ffedd5] font-mono text-xs font-semibold text-[#9a3412]">{idx + 1}</span>
                </td>
                <td className="px-2 py-2.5">{i.product_name}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{i.qty}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{rp(i.unit_price)}</td>
                <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums">{rp(i.line_subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="m-0 mt-6 flex list-none flex-col gap-2.5 p-0 sm:hidden print:hidden">
          {o.items.map((i, idx) => (
            <li key={i.id} className="flex gap-3 rounded-field border border-dashed border-[#fdba74] p-3 text-sm">
              <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#ffedd5] font-mono text-xs font-semibold text-[#9a3412]">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold">{i.product_name}</p>
                <dl className="m-0 mt-2 grid grid-cols-3 gap-2 text-right">
                  <div>
                    <dt><MiniLabel>Jumlah</MiniLabel></dt>
                    <dd className="m-0 font-mono tabular-nums">{i.qty}</dd>
                  </div>
                  <div>
                    <dt><MiniLabel>Harga satuan</MiniLabel></dt>
                    <dd className="m-0 font-mono tabular-nums">{rp(i.unit_price)}</dd>
                  </div>
                  <div>
                    <dt><MiniLabel>Subtotal</MiniLabel></dt>
                    <dd className="m-0 font-mono font-semibold tabular-nums">{rp(i.line_subtotal)}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 ml-auto max-w-sm space-y-1.5 text-sm">
          <div className="flex justify-between gap-4"><span>Total barang ({totalQty} item)</span><span className="font-mono tabular-nums">{rp(o.subtotal)}</span></div>
          {Number(o.discount_total) > 0 && (
            <div className="flex justify-between gap-4"><span>Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</span><span className="font-mono tabular-nums">−{rp(o.discount_total)}</span></div>
          )}
          <div className="flex justify-between gap-4"><span>Ongkos kirim</span><span className="font-mono tabular-nums">{rp(o.shipping_fee)}</span></div>
          <div className="mt-2 flex items-center justify-between gap-4 rounded-field bg-[#ea580c] px-4 py-3 text-white">
            <span className="font-display text-base font-bold">Total bayar</span>
            <span className="font-mono text-lg font-bold tabular-nums">{rp(o.grand_total)}</span>
          </div>
          <p className="m-0 pt-1 text-right text-xs text-[#5b5e6e]">Harga sudah termasuk PPN.</p>
        </div>

        <p className="mt-10 border-t border-[#e4e3ee] pt-3 text-[11px] text-[#5b5e6e]">
          Surat pesanan ini dibuat otomatis dari data pesanan dan tidak memerlukan tanda tangan.
        </p>
      </Paper>
    </section>
  );
}
