import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocToolbar, MiniLabel, Paper, SignatureBox, StoreBlock } from '../components/docs/shared';
import { useSeo } from '../lib/seo';

/** Surat jalan: dokumen pengiriman untuk kurir dan penerima. Tanpa harga. Identitas warna: slate. */
export default function DeliveryNote() {
  useSeo({ title: 'Surat jalan', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const order = useQuery({ queryKey: ['order', orderId], queryFn: () => api.order(orderId) });

  if (order.isPending) return <p className="text-muted">Memuat surat jalan…</p>;
  if (order.isError || !order.data) return <p className="text-error">Surat jalan tidak ditemukan.</p>;
  const o = order.data;
  const shipped = o.status === 'shipped' || o.status === 'completed';

  return (
    <section>
      <DocToolbar orderId={o.id} active="sj" />
      <Paper accent="#334155">
        {!shipped ? (
          <p className="rounded-field bg-[#f1f5f9] p-4 text-sm">
            Surat jalan tersedia setelah pesanan dikirim. Status saat ini: belum dikirim.
          </p>
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="m-0 font-display text-[30px] font-bold leading-none tracking-[0.06em] text-[#334155] sm:text-[36px]">SURAT JALAN</h1>
            <p className="mt-2 font-mono text-sm font-semibold">{o.invoice_no}</p>
          </div>
          <div className="w-full rounded-field border-2 border-dashed border-[#334155] bg-[#f8fafc] p-3 text-sm sm:w-auto sm:min-w-[240px]">
            <p className="m-0 font-display text-[11px] font-bold uppercase tracking-wider text-[#475569]">No. resi</p>
            <p className="m-0 font-mono text-lg font-bold tracking-wide">{o.tracking_number ?? 'Belum diisi'}</p>
            <p className="m-0 text-xs text-[#475569]">
              {o.courier ? `${o.courier.toUpperCase()} · ${o.courier_service ?? ''}` : 'Kurir toko'}
              {o.shipping_etd ? ` · estimasi ${o.shipping_etd}` : ''}
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-field bg-[#f1f5f9] p-4 text-sm">
            <h2 className="m-0 mb-1 font-display text-[11px] font-bold uppercase tracking-wider text-[#475569]">Pengirim</h2>
            <StoreBlock order={o} />
          </div>
          <div className="rounded-field border-[1.5px] border-[#334155] p-4 text-sm">
            <h2 className="m-0 mb-1 font-display text-[11px] font-bold uppercase tracking-wider text-[#475569]">Kirim ke</h2>
            <p className="m-0 font-display text-base font-bold">{o.buyer_name ?? '-'}</p>
            <p className="m-0 whitespace-pre-line">{o.shipping_address}</p>
            {o.destination_label && <p className="m-0 text-[#475569]">{o.destination_label}</p>}
          </div>
        </div>

        <table className="mt-6 hidden w-full border-collapse text-sm sm:table print:table">
          <thead>
            <tr className="border-b-2 border-[#334155] text-left text-[11px] font-bold uppercase tracking-wider [&_th]:bg-[#f1f5f9] [&_th]:text-[#475569]">
              <th className="w-14 px-2 py-2 font-bold">Cek</th>
              <th className="px-2 py-2 font-bold">Barang</th>
              <th className="px-2 py-2 text-right font-bold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-[#cbd5e1] print:break-inside-avoid">
                <td className="px-2 py-3"><span className="inline-block h-4 w-4 border-2 border-[#334155]" aria-label="kotak cek" /></td>
                <td className="px-2 py-3">{i.product_name}</td>
                <td className="px-2 py-3 text-right font-mono text-base font-semibold tabular-nums">{i.qty} unit</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="m-0 mt-6 flex list-none flex-col gap-2.5 p-0 sm:hidden print:hidden">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-3 rounded-field border border-[#cbd5e1] p-3 text-sm">
              <span className="mt-0.5 inline-block h-4 w-4 flex-none border-2 border-[#334155]" aria-label="kotak cek" />
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold">{i.product_name}</p>
                <MiniLabel>Jumlah</MiniLabel>
                <p className="m-0 font-mono text-base font-semibold tabular-nums">{i.qty} unit</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm">
          Periksa jumlah dan kondisi barang saat diterima. Jika ada kerusakan, catat pada BAST.{' '}
          {shipped && (
            <Link to={`/orders/${o.id}/bast`} className="font-semibold text-primary">Buat BAST di sini.</Link>
          )}
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 print:break-inside-avoid">
          <SignatureBox title="Pengirim" name={o.store_name || 'Penjual'} dateLabel="Tanggal: ____________" tone="slate" />
          <SignatureBox title="Penerima" name={o.buyer_name ?? 'Penerima'} dateLabel="Tanggal: ____________" tone="slate" />
        </div>
      </Paper>
    </section>
  );
}
