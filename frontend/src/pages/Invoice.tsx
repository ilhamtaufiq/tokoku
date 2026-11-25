import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ORDER_STATUS_LABEL, formatDate, percent, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

const btnBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field border px-3 text-[13px] font-semibold no-underline transition-[background-color,border-color,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const btnPrimary = `${btnBase} h-[34px] border-primary bg-primary text-on-primary hover:brightness-110 active:opacity-85`;
const btnOutline = `${btnBase} h-[34px] border-outline bg-surface text-ink hover:border-primary`;

/** Invoice atau surat pesanan yang bisa dicetak atau disimpan sebagai PDF lewat dialog cetak browser. */
export default function Invoice({ variant = 'invoice' }: { variant?: 'invoice' | 'sp' }) {
  const isSp = variant === 'sp';
  const label = isSp ? 'SURAT PESANAN' : 'INVOICE';
  useSeo({ title: isSp ? 'Surat pesanan' : 'Invoice', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['order', orderId], queryFn: () => api.order(orderId) });
  const store = useQuery({ queryKey: ['store'], queryFn: api.store });

  if (order.isPending) {
    return (
      <div role="status" aria-busy="true" className="mx-auto flex max-w-[840px] flex-col gap-4 rounded-card border border-outline-soft bg-surface p-6 sm:p-10">
        <span className="sr-only">Memuat dokumen…</span>
        <div className="h-8 w-48 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
        <div className="h-4 w-64 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
        <div className="mt-4 h-48 animate-pulse rounded-field bg-surface-high motion-reduce:animate-none" />
      </div>
    );
  }
  if (order.isError || !order.data) {
    return (
      <p className="my-3 rounded-field bg-error-soft px-4 py-3 text-sm text-on-error-soft">
        Dokumen tidak ditemukan.
      </p>
    );
  }

  const o = order.data;
  const s = store.data;
  const unpaid = o.payment_status !== 'paid' && o.payment_status !== 'refunded';

  return (
    <section className="mx-auto max-w-[840px] print:max-w-none">
      <div className="print:hidden mb-4 flex flex-wrap justify-between gap-2.5">
        <Link to={`/orders/${o.id}`} className={btnOutline}>← Kembali ke pesanan</Link>
        <button type="button" className={btnPrimary} onClick={() => window.print()}>Cetak / Simpan PDF</button>
      </div>

      {/* Kertas dokumen selalu putih dengan warna tetap, termasuk di mode gelap dan saat dicetak. */}
      <article className="rounded-banner border border-outline-soft bg-white p-6 text-[#1a1b22] sm:p-12 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap justify-between gap-6 border-b-2 border-[#1a1b22] pb-6">
          <div className="min-w-0">
            <h1 className="m-0 font-display text-[28px] font-bold tracking-[0.5px] text-[#1a1b22] sm:text-[32px]">{label}</h1>
            <p className="my-1.5 font-mono font-medium text-[#1a1b22]">{o.invoice_no}</p>
            <p className="my-0.5 text-xs text-[#5b5e6e]">Tanggal: {formatDate(o.created_at)}</p>
            <p className="my-0.5 text-xs text-[#5b5e6e]">Status: {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
          </div>
          <div className="min-w-0 text-left sm:text-right">
            <strong className="font-display text-lg text-[#1a1b22]">{s?.name || 'Nama toko belum diatur'}</strong>
            {s?.npwp && <p className="my-0.5 text-sm text-[#444653]">NPWP: {formatNpwp(s.npwp)}</p>}
            {s?.address && <p className="my-0.5 text-sm text-[#444653]">{s.address}</p>}
            {s?.phone && <p className="my-0.5 text-sm text-[#444653]">Telp: {s.phone}</p>}
          </div>
        </header>

        <div className="flex flex-wrap justify-between gap-6 py-6">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.8px] text-[#757684]">Ditagihkan kepada</p>
            <strong className="text-[#1a1b22]">{o.buyer_name ?? '-'}</strong>
            <p className="my-1 whitespace-pre-wrap text-[13px] text-[#444653]">{o.shipping_address}</p>
            {o.buyer_npwp && <p className="my-1 text-[13px] text-[#444653]">NPWP: {formatNpwp(o.buyer_npwp)}</p>}
          </div>
          {o.tracking_number && (
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.8px] text-[#757684]">Pengiriman</p>
              <p className="my-1 text-[13px] text-[#444653]">Nomor resi: <strong className="text-[#1a1b22]">{o.tracking_number}</strong></p>
            </div>
          )}
        </div>

        <div className="overflow-hidden">
          <table className="w-full border-collapse text-[13px] sm:text-sm">
            <thead>
              <tr>
                <th className="bg-transparent border-b border-[#1a1b22] px-1.5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.6px] text-[#5b5e6e] sm:px-2 sm:text-[11px]">Barang</th>
                <th className="bg-transparent whitespace-nowrap border-b border-[#1a1b22] px-1.5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.6px] text-[#5b5e6e] sm:px-2 sm:text-[11px]">Qty</th>
                <th className="bg-transparent border-b border-[#1a1b22] px-1.5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.6px] text-[#5b5e6e] sm:px-2 sm:text-[11px]">Harga (termasuk PPN)</th>
                <th className="bg-transparent whitespace-nowrap border-b border-[#1a1b22] px-1.5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.6px] text-[#5b5e6e] sm:px-2 sm:text-[11px]">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.product_id}>
                  <td className="bg-transparent border-b border-[#e4e3ee] px-1.5 py-3 align-top text-[#1a1b22] [overflow-wrap:anywhere] sm:px-2">
                    {i.product_name}
                    {!i.is_taxable && <span className="text-xs text-[#5b5e6e]"> (tidak kena PPN)</span>}
                  </td>
                  <td className="bg-transparent whitespace-nowrap border-b border-[#e4e3ee] px-1.5 py-3 text-right align-top tabular-nums text-[#1a1b22] sm:px-2">{i.qty}</td>
                  <td className="bg-transparent whitespace-nowrap border-b border-[#e4e3ee] px-1.5 py-3 text-right align-top tabular-nums text-[#1a1b22] sm:px-2">{rp(i.unit_price)}</td>
                  <td className="bg-transparent whitespace-nowrap border-b border-[#e4e3ee] px-1.5 py-3 text-right align-top tabular-nums text-[#1a1b22] sm:px-2">{rp(i.line_subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <dl className="m-0 flex w-full flex-col gap-2.5 sm:w-[340px]">
            <TotalRow label="Subtotal" value={rp(o.subtotal)} />
            {Number(o.discount_total) > 0 && (
              <TotalRow label={`Diskon${o.promo_code ? ` (${o.promo_code})` : ''}`} value={`−${rp(o.discount_total)}`} />
            )}
            {Number(o.dpp) > 0 && (
              <>
                <TotalRow label="DPP (dasar pengenaan pajak)" value={rp(o.dpp)} sub />
                <TotalRow label={`PPN ${percent(o.ppn_rate)}`} value={rp(o.ppn_total)} sub />
              </>
            )}
            <TotalRow label="Ongkos kirim (tidak kena PPN)" value={rp(o.shipping_fee)} />
            <div className="mt-1.5 flex justify-between gap-3 border-t-2 border-[#1a1b22] pt-3 text-[#1a1b22]">
              <dt className="font-display text-xl font-bold">Total</dt>
              <dd className="m-0 font-display text-xl font-bold tabular-nums">{rp(o.grand_total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 border-0 border-t border-dashed border-[#c4c5d5] pt-4 text-[#444653]">
          {isSp && <p className="my-1 text-xs">Surat pesanan ini bukan bukti pembayaran. Bukti bayar tersedia di invoice setelah pembayaran lunas.</p>}
          {!isSp && o.payment_status === 'paid' && <p className="my-1 text-xs"><strong>LUNAS</strong> · dibayar melalui Midtrans</p>}
          {!isSp && unpaid && <p className="my-1 text-xs">Belum dibayar. Batas pembayaran sesuai halaman pesanan.</p>}
          {o.payment_status === 'refunded' && <p className="my-1 text-xs">Pesanan dibatalkan. Dana dikembalikan kepada pembeli.</p>}
          <p className="my-1 text-xs text-[#5b5e6e]">Harga sudah termasuk PPN. Dokumen ini dibuat secara elektronik.</p>
        </footer>
      </article>
    </section>
  );
}

function TotalRow({ label, value, sub = false }: { label: string; value: string; sub?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 text-sm ${sub ? 'text-[13px] text-[#5b5e6e]' : 'text-[#444653]'}`}>
      <dt>{label}</dt>
      <dd className="m-0 font-mono text-sm tabular-nums text-[#1a1b22]">{value}</dd>
    </div>
  );
}

function formatNpwp(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 15) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12)}`;
  return raw;
}
