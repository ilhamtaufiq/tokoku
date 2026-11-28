import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DocBanner, DocToolbar, MiniLabel, Paper, SignatureBox, docDate } from '../components/docs/shared';
import { DEMO_DOC_ITEM_WEIGHT_GRAM } from '../data/demo';
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
  const totalQty = o.items.reduce((sum, i) => sum + i.qty, 0);
  const weightOf = (idx: number) => DEMO_DOC_ITEM_WEIGHT_GRAM[idx] ?? 200;
  const noSj = `SJ-${String(o.id).padStart(5, '0')}`;

  return (
    <section>
      <DocToolbar orderId={o.id} active="sj" />
      <DocBanner
        icon="fact_check"
        title="Surat jalan"
        subtitle="Non-finansial: hanya verifikasi kuantitas fisik dan koli logistik."
        actions={
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-semibold text-on-primary" onClick={() => window.print()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">print</span>
            Cetak surat jalan
          </button>
        }
      />

      <Paper accent="#334155">
        {!shipped ? (
          <p className="mb-6 rounded-field bg-[#f1f5f9] p-4 text-sm">
            Surat jalan tersedia setelah pesanan dikirim. Status saat ini: belum dikirim.
          </p>
        ) : null}

        {/* Kepala: judul pengiriman dan nomor surat jalan */}
        <header className="flex flex-col items-start justify-between gap-6 md:flex-row">
          <div className="flex-1">
            <h1 className="mb-0 mt-5 font-display text-[22px] font-black uppercase leading-tight tracking-tight text-[#1a1b22] sm:text-[26px]">
              Surat jalan
            </h1>
            <p className="m-0 mt-2 text-sm">Pesanan <span className="font-mono font-semibold">{o.invoice_no}</span></p>
          </div>

          <div className="w-full space-y-3 rounded-card bg-[#f8fafc] p-4 text-sm md:w-[300px]">
            <div className="text-right">
              <p className="m-0 font-display text-[10px] font-bold uppercase tracking-wider text-[#475569]">No. surat jalan / delivery note</p>
              <p className="m-0 font-mono text-xs font-bold text-[#334155]">{noSj}</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-field border-2 border-dashed border-[#334155] bg-white p-3">
              <div>
                <p className="m-0 font-display text-[10px] font-bold uppercase tracking-wider text-[#475569]">No. resi</p>
                <p className="m-0 font-mono text-base font-bold tracking-wide">{o.tracking_number ?? 'Belum diisi'}</p>
                <p className="m-0 text-xs text-[#475569]">
                  {o.courier ? `${o.courier.toUpperCase()} · ${o.courier_service ?? ''}` : 'Kurir toko'}
                  {o.shipping_etd ? ` · estimasi ${o.shipping_etd}` : ''}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Ringkasan pengiriman */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-field bg-[#f1f5f9] p-3">
            <MiniLabel>Tanggal terbit &amp; kirim</MiniLabel>
            <p className="m-0 mt-1 text-sm font-semibold">{docDate(o.created_at)}</p>
          </div>
          <div className="rounded-field bg-[#f1f5f9] p-3">
            <MiniLabel>Layanan logistik</MiniLabel>
            <p className="m-0 mt-1 text-sm font-semibold">{o.courier ? `${o.courier.toUpperCase()} ${o.courier_service ?? ''}` : 'Kurir toko'}</p>
          </div>
        </div>

        {/* Pengirim dan penerima */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-card bg-[#f1f5f9] p-4 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="m-0 font-display text-[11px] font-bold uppercase tracking-wider text-[#475569]">Asal gudang / pengirim</h2>
            </div>
            <p className="m-0 font-display text-base font-bold">{o.store_name || 'Penjual'}</p>
            {o.store_address && <p className="m-0 whitespace-pre-line">{o.store_address}</p>}
            {o.store_phone && <p className="m-0 font-mono text-xs">Telp: {o.store_phone}</p>}
          </div>
          <div className="rounded-card border-[1.5px] border-[#334155] p-4 text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="m-0 font-display text-[11px] font-bold uppercase tracking-wider text-[#475569]">Tujuan penerima / konsinyasi</h2>
            </div>
            <p className="m-0 font-display text-base font-bold">{o.buyer_name ?? '-'}</p>
            <p className="m-0 whitespace-pre-line">{o.shipping_address}</p>
            {o.destination_label && <p className="m-0 text-[#475569]">{o.destination_label}</p>}
            <div className="mt-3 rounded-field bg-white p-2">
              <p className="m-0 text-[11px] text-[#475569]">Penerima kuasa / satpam</p>
              <p className="m-0 text-sm font-semibold">{o.buyer_name ?? 'Penerima'}</p>
            </div>
          </div>
        </div>

        {/* Tabel barang: tabel di layar lebar, kartu di layar sempit */}
        <div className="mt-6">
          <table className="hidden w-full border-collapse text-sm md:table print:table">
            <thead>
              <tr className="border-b-2 border-[#334155] bg-[#f1f5f9] text-left text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                <th className="w-10 px-2 py-2 text-center">No</th>
                <th className="px-2 py-2">Deskripsi fisik barang &amp; no. seri</th>
                <th className="px-2 py-2 text-center">Order</th>
                <th className="px-2 py-2 text-center">Kirim</th>
                <th className="px-2 py-2 text-right">Berat</th>
                <th className="px-2 py-2">Verifikasi fisik</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i, idx) => (
                <tr key={i.id} className="border-b border-[#cbd5e1] align-top print:break-inside-avoid">
                  <td className="px-2 py-3 text-center font-mono text-xs text-[#5b5e6e]">{idx + 1}</td>
                  <td className="px-2 py-3">
                    <p className="m-0 font-display text-sm font-bold leading-snug">{i.product_name}</p>
                  </td>
                  <td className="px-2 py-3 text-center font-mono font-semibold">{i.qty} unit</td>
                  <td className="px-2 py-3 text-center font-mono font-semibold">{i.qty} unit</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{weightOf(idx).toLocaleString('id-ID')} gr</td>
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1"><span className="inline-block h-4 w-4 border-2 border-[#334155]" aria-label="kotak cek" /> Baik</span>
                      <span className="inline-flex items-center gap-1 text-[#dc2626]"><span className="inline-block h-4 w-4 border-2 border-[#334155]" /> Rusak</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:hidden print:hidden">
            {o.items.map((i, idx) => (
              <li key={i.id} className="flex gap-3 rounded-field border border-[#cbd5e1] p-3 text-sm">
                <span className="mt-0.5 inline-block h-4 w-4 flex-none border-2 border-[#334155]" aria-label="kotak cek" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold">{i.product_name}</p>
                  <dl className="m-0 mt-2 grid grid-cols-2 gap-2 text-right">
                    <div>
                      <dt><MiniLabel>Jumlah</MiniLabel></dt>
                      <dd className="m-0 font-mono text-sm font-semibold tabular-nums">{i.qty} unit</dd>
                    </div>
                    <div>
                      <dt><MiniLabel>Berat</MiniLabel></dt>
                      <dd className="m-0 font-mono tabular-nums">{weightOf(idx).toLocaleString('id-ID')} gr</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Ringkasan beban muatan */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card bg-[#f1f5f9] p-4">
          <div>
            <p className="m-0 font-display text-[10px] font-bold uppercase tracking-wider text-[#475569]">Ringkasan muatan</p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="m-0 text-[11px] text-[#475569]">Total item fisik</p>
              <p className="m-0 font-display text-base font-bold">{totalQty} unit</p>
            </div>
          </div>
        </div>

        {/* Klausul penyerahan dan penerimaan barang */}
        <div className="mt-6 rounded-card border border-[#cbd5e1] p-4 text-xs leading-relaxed text-[#1a1b22]">
          <p className="m-0 mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#475569]">Klausul penyerahan &amp; penerimaan barang</p>
          {/* DEMO */}
          <ol className="m-0 list-decimal space-y-1 pl-4">
            <li>Surat jalan ini merupakan dokumen sah serah terima fisik barang dan <strong>tidak berfungsi</strong> sebagai tanda terima pembayaran atau faktur tagihan.</li>
            <li>Penerima wajib melakukan pemeriksaan kasat mata atas kondisi kemasan, segel, dan kesesuaian nomor seri (SN) sebelum menandatangani dokumen ini.</li>
            <li>
              Klaim kerusakan akibat ekspedisi wajib dicatat secara tertulis pada lembar ini dengan persetujuan kurir dan dilaporkan maksimal 1x24 jam sejak waktu penerimaan. Jika ada kerusakan, catat pada BAST.{' '}
              {shipped && (
                <Link to={`/orders/${o.id}/bast`} className="font-semibold text-primary">Buat BAST di sini.</Link>
              )}
            </li>
          </ol>
        </div>

        {/* Tanda tangan: pengirim, driver, dan penerima */}
        <div className="mt-10 grid gap-6 md:grid-cols-3 print:break-inside-avoid">
          <SignatureBox
            title="1. Pengirim / petugas gudang"
            name={o.store_name || 'Penjual'}
            dateLabel="Tanggal: ____________"
            tone="slate"
          />
          <SignatureBox
            title="2. Driver / ekspedisi"
            name="Driver / kurir"
            tone="slate"
          />
          <SignatureBox
            title="3. Penerima barang"
            name={o.buyer_name ?? 'Penerima'}
            sub="Staf / keamanan sekolah"
            dateLabel="Tgl terima: ____ / ____ / 2025"
            tone="slate"
          />
        </div>

        <div className="mt-8 flex flex-col gap-1 border-t border-[#e4e3ee] pt-3 font-mono text-[10px] text-[#5b5e6e] md:flex-row md:justify-between">
          <span>ID dokumen sistem: DO-{String(o.id).padStart(6, '0')}</span>
          {/* DEMO */}
          <span>Lembar 1: arsip penerima • Lembar 2: ekspedisi • Lembar 3: gudang</span>
        </div>
      </Paper>
    </section>
  );
}
