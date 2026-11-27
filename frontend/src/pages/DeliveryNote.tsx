import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocToolbar, Paper, SignatureBox, StoreBlock } from '../components/docs/shared';
import { useSeo } from '../lib/seo';

/** Surat jalan: dokumen pengiriman untuk kurir dan penerima. Tanpa harga. */
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
          <p className="rounded-md bg-[#f1f5f9] p-4 text-sm">
            Surat jalan tersedia setelah pesanan dikirim. Status saat ini: belum dikirim.
          </p>
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="m-0 font-display text-[36px] font-bold leading-none tracking-[0.08em] text-[#334155]">SURAT JALAN</h1>
            <p className="mt-2 font-mono text-sm">{o.invoice_no}</p>
          </div>
          <div className="min-w-[220px] rounded-md border-2 border-dashed border-[#334155] p-3 text-sm">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#475569]">No. resi</p>
            <p className="m-0 font-mono text-lg font-bold">{o.tracking_number ?? 'Belum diisi'}</p>
            <p className="m-0 text-xs text-[#475569]">
              {o.courier ? `${o.courier.toUpperCase()} · ${o.courier_service ?? ''}` : 'Kurir toko'}
              {o.shipping_etd ? ` · estimasi ${o.shipping_etd}` : ''}
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-md bg-[#f1f5f9] p-4 text-sm">
            <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#475569]">Pengirim</p>
            <StoreBlock order={o} />
          </div>
          <div className="rounded-md border border-[#334155] p-4 text-sm">
            <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-wider text-[#475569]">Kirim ke</p>
            <p className="m-0 text-base font-bold">{o.buyer_name ?? '-'}</p>
            <p className="m-0 whitespace-pre-line">{o.shipping_address}</p>
            {o.destination_label && <p className="m-0 text-[#475569]">{o.destination_label}</p>}
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-[#334155] text-left text-[11px] uppercase tracking-wider text-[#475569]">
              <th className="w-10 py-2 pr-2">Cek</th>
              <th className="py-2 pr-2">Barang</th>
              <th className="py-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id} className="border-b border-[#cbd5e1]">
                <td className="py-3 pr-2"><span className="inline-block h-4 w-4 border-2 border-[#334155]" aria-label="kotak cek" /></td>
                <td className="py-3 pr-2">{i.product_name}</td>
                <td className="py-3 text-right text-base font-semibold tabular-nums">{i.qty} unit</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-5 text-sm">
          Periksa jumlah dan kondisi barang saat diterima. Jika ada kerusakan, catat pada BAST.{' '}
          {shipped && (
            <Link to={`/orders/${o.id}/bast`} className="font-semibold text-primary">Buat BAST di sini.</Link>
          )}
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <SignatureBox title="Pengirim" name={o.store_name || 'Penjual'} dateLabel="Tanggal: ____________" />
          <SignatureBox title="Penerima" name={o.buyer_name ?? 'Penerima'} dateLabel="Tanggal: ____________" />
        </div>
      </Paper>
    </section>
  );
}
