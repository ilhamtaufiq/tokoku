import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { BrandMark, DocBadge, DocBanner, DocToolbar, MiniLabel, Paper, SignatureBox, docDate, formatNpwp, terbilang } from '../components/docs/shared';
import { percent, rp } from '../lib/money';
import { useSeo } from '../lib/seo';

/**
 * Surat pesanan: dokumen sebelum bayar, bukan bukti pembayaran. Memuat rincian pajak (DPP dan PPN) seperti pada Stitch.
 * Identitas warna: oranye.
 */
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
      <DocBanner
        icon="shield_locked"
        title="Surat pesanan"
        badges={
          <>
            <DocBadge className={unpaid ? 'bg-[#ffedd5] text-[#9a3412]' : 'bg-[#dcfce7] text-[#166534]'}>
              {unpaid ? 'Menunggu pembayaran' : 'Sudah dibayar'}
            </DocBadge>
          </>
        }
        actions={
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-semibold text-on-primary" onClick={() => window.print()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">print</span>
            Cetak Lembar Kerja (A4)
          </button>
        }
      />

      <Paper accent="#ea580c">
        {/* Peringatan: ini bukan bukti pembayaran */}
        <div className="mb-6 flex gap-3 rounded-field border-2 border-[#ea580c] bg-[#fff7ed] p-4 text-sm text-[#7c2d12]" role="note">
          <span className="material-symbols-outlined !text-[22px] text-[#ea580c]" aria-hidden="true">warning</span>
          <div>
            <p className="m-0 font-display text-sm font-black uppercase tracking-wide text-[#9a3412]">
              Perhatian: dokumen ini adalah surat pesanan sebelum pembayaran
            </p>
            <p className="m-0 mt-1">
              <strong className="font-display text-[15px] font-bold uppercase tracking-wide">Ini bukan bukti pembayaran.</strong>{' '}
              {unpaid
                ? deadline && `Bayar sebelum ${docDate(deadline.toISOString())} agar pesanan diproses. Setelah lunas, invoice akan tersedia.`
                : 'Bukti pembayaran tersedia di invoice.'}
            </p>
          </div>
        </div>

        {/* Kepala: penerbit dan nomor dokumen */}
        <header className="flex flex-col items-start justify-between gap-6 pb-6 md:flex-row">
          <div className="max-w-[460px] flex-1">
            <BrandMark letter="T" name="Tokoku" />
            <div className="mt-2 space-y-0.5 text-sm">
              <p className="m-0 font-semibold">{o.store_name || 'Nama toko belum diatur'}</p>
              {o.store_npwp && <p className="m-0 text-xs text-[#5b5e6e]">NPWP: <span className="font-mono">{formatNpwp(o.store_npwp)}</span></p>}
              {o.store_address && <p className="m-0 whitespace-pre-line text-xs text-[#5b5e6e]">{o.store_address}</p>}
              {o.store_phone && <p className="m-0 text-xs text-[#5b5e6e]">Layanan mitra: {o.store_phone}</p>}
            </div>
          </div>
          <div className="w-full rounded-card border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm md:w-[280px]">
            <dl className="m-0 mt-2 space-y-0.5 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-[#5b5e6e]">Tanggal pesanan</dt><dd className="m-0 font-semibold">{docDate(o.created_at)}</dd></div>
              {deadline && (
                <div className="flex justify-between gap-2"><dt className="text-[#5b5e6e]">Jatuh tempo</dt><dd className="m-0 font-semibold text-[#c2410c]">{docDate(deadline.toISOString())}</dd></div>
              )}
            </dl>
          </div>
        </header>

        {/* Judul bagian dokumen dan kode anggaran */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#ea580c] pb-2">
          <h1 className="m-0 font-display text-lg font-black uppercase tracking-tight text-[#1a1b22]">Surat pesanan</h1>
        </div>

        {/* Dua kartu: data satuan pendidikan dan alamat pengiriman */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-card bg-[#fff7ed] p-4">
            <p className="m-0 mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#c2410c]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">school</span>
              Data satuan pendidikan (pembeli)
            </p>
            <h2 className="m-0 font-display text-base font-bold">{o.buyer_name ?? '-'}</h2>
            <dl className="m-0 mt-2 space-y-1 text-sm">
              <div className="flex gap-2"><dt className="w-[120px] flex-none text-[#5b5e6e]">NPWP</dt><dd className="m-0 font-mono">: {o.buyer_npwp ?? '-'}</dd></div>
            </dl>
          </div>
          <div className="rounded-card bg-[#fff7ed] p-4">
            <p className="m-0 mb-2 flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#c2410c]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">local_shipping</span>
              Alamat pengiriman &amp; penerima
            </p>
            <p className="m-0 whitespace-pre-line text-sm">{o.shipping_address}</p>
            {o.destination_label && <p className="m-0 mt-1 text-sm text-[#5b5e6e]">Kecamatan: {o.destination_label}</p>}
            <dl className="m-0 mt-2 space-y-1 text-sm">
              <div className="flex gap-2"><dt className="w-[120px] flex-none text-[#5b5e6e]">Instruksi bongkar</dt><dd className="m-0 font-semibold text-[#c2410c]">: Wajib jam kerja (08:00 - 15:00 WIB)</dd></div>
            </dl>
          </div>
        </div>

        {/* Tabel item: tabel di layar lebar, kartu di layar sempit */}
        <div className="mb-6">
          <table className="hidden w-full border-collapse text-xs md:table print:table">
            <thead>
              <tr className="bg-[#00288e] text-left text-[10px] font-bold uppercase tracking-wider text-white">
                <th className="px-2 py-2.5 text-center">No</th>
                <th className="px-2 py-2.5">Rincian barang &amp; spesifikasi teknis</th>
                <th className="px-2 py-2.5">Toko penyedia</th>
                <th className="px-2 py-2.5 text-center">Jumlah</th>
                <th className="px-2 py-2.5">Estimasi logistik</th>
                <th className="px-2 py-2.5 text-right">Harga satuan (inc. PPN)</th>
                <th className="px-2 py-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i, idx) => (
                <tr key={i.id} className="border-b border-[#fed7aa] align-top print:break-inside-avoid">
                  <td className="px-2 py-3 text-center font-mono font-semibold text-[#9a3412]">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="px-2 py-3">
                    <p className="m-0 font-display text-sm font-bold leading-snug">{i.product_name}</p>
                    <p className="m-0 mt-0.5 font-mono text-[10px] font-bold text-[#c2410c]">#{i.product_id}</p>
                  </td>
                  <td className="px-2 py-3 text-[#5b5e6e]">{o.store_name ?? 'Penjual'}</td>
                  <td className="px-2 py-3 text-center font-mono font-bold">{i.qty} unit</td>
                  <td className="px-2 py-3 text-[#5b5e6e]">
                    {o.courier ? `${o.courier.toUpperCase()} ${o.courier_service ?? ''}` : 'Kurir toko'}
                    {o.estimated_days ? <span className="block font-mono text-[11px]">{o.estimated_days} hari kerja</span> : o.shipping_etd ? <span className="block font-mono text-[11px]">{o.shipping_etd}</span> : null}
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{rp(i.unit_price)}</td>
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums">{rp(i.line_subtotal)}</td>
                </tr>
              ))}
              {/* Biaya pengiriman dan proteksi (data dari ongkos kirim pesanan) */}
              <tr className="bg-[#fff7ed] align-top print:break-inside-avoid">
                <td className="px-2 py-3 text-center font-mono font-semibold text-[#9a3412]">{String(o.items.length + 1).padStart(2, '0')}</td>
                <td className="px-2 py-3">
                  <p className="m-0 font-display text-sm font-bold leading-snug">Biaya pengiriman</p>
                  <p className="m-0 mt-0.5 text-[11px] text-[#5b5e6e]">Layanan antar sampai ruang sekolah, bebas PPN</p>
                </td>
                <td className="px-2 py-3 text-[#5b5e6e]">-</td>
                <td className="px-2 py-3 text-center font-mono">1 paket</td>
                <td className="px-2 py-3 text-[#5b5e6e]">Non-PPN</td>
                <td className="px-2 py-3 text-right font-mono tabular-nums">{rp(o.shipping_fee)}</td>
                <td className="px-2 py-3 text-right font-mono font-bold tabular-nums">{rp(o.shipping_fee)}</td>
              </tr>
            </tbody>
          </table>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:hidden print:hidden">
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
        </div>

        {/* Rekap tagihan */}
        <div className="mb-6 grid grid-cols-1 gap-4">
          <div className="flex flex-col justify-between rounded-card bg-[#fff7ed] p-4">
            <p className="m-0 mb-2 font-display text-[11px] font-bold uppercase tracking-wider text-[#c2410c]">Rekapitulasi tagihan belanja</p>
            <dl className="m-0 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Dasar pengenaan pajak (DPP)</dt><dd className="m-0 font-mono tabular-nums">{rp(o.dpp)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">PPN terutang {percent(o.ppn_rate)}</dt><dd className="m-0 font-mono tabular-nums">{rp(o.ppn_total)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Total barang ({totalQty} item)</dt><dd className="m-0 font-mono tabular-nums">{rp(o.subtotal)}</dd></div>
              {Number(o.discount_total) > 0 && (
                <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt><dd className="m-0 font-mono tabular-nums">−{rp(o.discount_total)}</dd></div>
              )}
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Ongkos angkut &amp; perlindungan</dt><dd className="m-0 font-mono tabular-nums">{rp(o.shipping_fee)}</dd></div>
            </dl>
            <div className="mt-4 rounded-card bg-[#ea580c] px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-4">
                <span className="font-display text-sm font-bold uppercase">Total tagihan</span>
                <span className="font-mono text-xl font-black tabular-nums">{rp(o.grand_total)}</span>
              </div>
              <p className="m-0 mt-1 text-right text-[11px] italic text-[#ffedd5]">Terbilang: {terbilang(o.grand_total)}</p>
            </div>
            <p className="m-0 pt-2 text-right text-xs text-[#5b5e6e]">Harga sudah termasuk PPN.</p>
          </div>
        </div>

        {/* Tanda tangan: pemesan dan penyelenggara pengadaan */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 print:break-inside-avoid">
          <SignatureBox
            title="Pihak pemesan (satuan pendidikan)"
            name={o.buyer_name ?? 'Pemesan'}
            tone="orange"
          />
          <SignatureBox
            title="Pihak penjual"
            name={o.store_name || 'Penjual'}
            tone="orange"
          />
        </div>

        <div className="flex flex-col gap-1 border-t border-[#e4e3ee] pt-3 text-[11px] text-[#5b5e6e] md:flex-row md:justify-between">
          <span>
            Surat pesanan ini dibuat otomatis dari data pesanan dan tidak memerlukan tanda tangan basah.
          </span>
        </div>
      </Paper>

    </section>
  );
}
