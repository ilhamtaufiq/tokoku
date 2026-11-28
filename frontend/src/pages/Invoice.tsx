import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import {
  BrandMark,
  DemoQr,
  DocBadge,
  DocBanner,
  DocToolbar,
  MiniLabel,
  Paper,
  SectionBar,
  SignatureBox,
  Stamp,
  docDate,
  formatNpwp,
  terbilang,
} from '../components/docs/shared';
import {
  DEMO_BUDGET,
  DEMO_CHECKOUT_INSURANCE,
  DEMO_DOC_HASH,
  DEMO_DOC_KPP,
  DEMO_DOC_METERAI,
  DEMO_DOC_SIGN,
  DEMO_DOC_TAX_SCHEME,
  DEMO_DOC_UNIT,
  DEMO_INSTANSI,
  DEMO_QR_CODE,
  DEMO_TAX_SERIES,
} from '../data/demo';
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
  const ppnDivisor = 1 + Number(o.ppn_rate) / 100;
  const lineDpp = (subtotal: string) => Math.round(Number(subtotal) / ppnDivisor);
  const statusLabel = paid ? 'LUNAS' : refunded ? 'DIKEMBALIKAN' : 'BELUM DIBAYAR';

  return (
    <section>
      <DocToolbar orderId={o.id} active="invoice" />
      <DocBanner
        icon="verified"
        title="Validasi Dokumen Pajak Sah"
        badges={<DocBadge className="bg-tertiary-fixed text-on-tertiary-fixed">Terhubung DJP</DocBadge>}
        subtitle="Sesuai Peraturan Dirjen Pajak PER-03/PJ/2022 & Tarif PPN 11% UU HPP"
        actions={
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-semibold text-on-primary" onClick={() => window.print()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">print</span>
            Cetak Faktur
          </button>
        }
      />

      <Paper accent="#00288e">
        {/* Kepala dokumen: penerbit (kiri) dan klasifikasi dokumen (kanan) */}
        <header className="flex flex-col items-start justify-between gap-6 pb-6 md:flex-row">
          <div className="max-w-[480px] flex-1">
            <BrandMark name="Tokoku" badge="Mitra Edukasi" />
            <p className="m-0 mt-1 text-sm font-semibold">{o.store_name || 'Nama toko belum diatur'}</p>
            <div className="mt-2 space-y-0.5 text-xs text-[#5b5e6e]">
              {o.store_npwp && <p className="m-0"><span className="font-semibold text-[#1a1b22]">NPWP PKP:</span> <span className="font-mono">{formatNpwp(o.store_npwp)}</span></p>}
              {o.store_address && <p className="m-0 whitespace-pre-line">{o.store_address}</p>}
              {/* DEMO */}
              <p className="m-0">{DEMO_DOC_KPP}</p>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-col items-start text-left md:items-end md:text-right">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#eff4ff] px-3 py-1 text-[#00288e]">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">receipt_long</span>
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">Dokumen Resmi Pajak</span>
            </span>
            <h1 className="m-0 font-display text-[22px] font-black uppercase leading-tight tracking-tight text-[#1a1b22] sm:text-[26px]">
              Faktur Penjualan & Invoice Pajak
            </h1>
            <div className="mt-2 space-y-0.5 text-sm">
              <p className="m-0"><span className="text-[#5b5e6e]">No. Invoice:</span> <span className="font-mono font-bold text-[#00288e]">{o.invoice_no}</span></p>
              <p className="m-0"><span className="text-[#5b5e6e]">Tanggal Faktur:</span> <span className="font-semibold">{docDate(o.created_at)}</span></p>
              {/* DEMO */}
              <p className="m-0"><span className="text-[#5b5e6e]">No. Seri e-Faktur:</span> <span className="font-mono font-bold">{DEMO_TAX_SERIES}</span></p>
              <p className="m-0"><span className="text-[#5b5e6e]">Kode Pesanan:</span> <span className="font-mono">ORD-{String(o.id).padStart(5, '0')}</span></p>
              <p className="m-0 text-xs text-[#5b5e6e]">Status pesanan: {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
            </div>
            {paid && (
              <div className="pointer-events-none mt-3 -rotate-6 md:absolute md:right-8 md:top-20 md:mt-0" aria-hidden="true">
                <Stamp color="#15803d" className="!text-base">
                  LUNAS / SAH
                </Stamp>
                {/* DEMO */}
                <p className="m-0 mt-0.5 text-center font-mono text-[9px] font-semibold uppercase tracking-wider text-[#15803d]">Verified DJP Electronic</p>
              </div>
            )}
          </div>
        </header>

        {/* Dua kartu: identitas instansi pembeli dan informasi anggaran serta transaksi */}
        <div className="mb-6 mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-card bg-[#eff4ff] p-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 rounded-field bg-[#dce9ff] px-3 py-1.5 text-[#00288e]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">account_balance</span>
                  <span className="font-display text-[11px] font-bold uppercase tracking-wider">Identitas Instansi Pembeli</span>
                </span>
                {o.buyer_npwp && <DocBadge className="bg-white text-[#5b5e6e]">NPWP valid</DocBadge>}
              </div>
              <h2 className="m-0 font-display text-lg font-bold">{o.buyer_name ?? '-'}</h2>
              <dl className="m-0 mt-2 space-y-1 text-sm">
                {/* DEMO */}
                <div className="flex gap-2"><dt className="w-[120px] flex-none text-[#5b5e6e]">Penanggung jawab</dt><dd className="m-0 font-semibold">: {DEMO_INSTANSI.pic} ({DEMO_INSTANSI.picRole})</dd></div>
                <div className="flex gap-2"><dt className="w-[120px] flex-none text-[#5b5e6e]">NPWP instansi</dt><dd className="m-0 font-mono font-semibold">: {o.buyer_npwp ?? '-'}</dd></div>
                <div className="flex gap-2"><dt className="w-[120px] flex-none text-[#5b5e6e]">Alamat pengiriman</dt><dd className="m-0 whitespace-pre-line leading-snug">: {o.shipping_address}</dd></div>
              </dl>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-field bg-white px-3 py-2 text-sm">
              <span className="text-[#5b5e6e]">ID pelanggan Kemdikbudristek</span>
              {/* DEMO */}
              <span className="font-mono text-xs font-bold text-[#00288e]">NPSN: {DEMO_INSTANSI.npsn}</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-card bg-[#eff4ff] p-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 rounded-field bg-[#dce9ff] px-3 py-1.5 text-[#00288e]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
                  <span className="font-display text-[11px] font-bold uppercase tracking-wider">Informasi Anggaran & Transaksi</span>
                </span>
                {/* DEMO */}
                <DocBadge className="bg-white text-[#c2410c]">BOS Reguler</DocBadge>
              </div>
              <dl className="m-0 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Sumber pendanaan</dt><dd className="m-0 text-right font-semibold">{DEMO_BUDGET.source}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Mata anggaran kegiatan (MAK)</dt><dd className="m-0 font-mono text-right">{DEMO_BUDGET.mak}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Metode pembayaran</dt><dd className="m-0 text-right font-semibold">Midtrans</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Status pelunasan</dt><dd className="m-0"><DocBadge className={paid ? 'bg-[#15803d] text-white' : 'bg-white text-[#5b5e6e]'}>{statusLabel}</DocBadge></dd></div>
              </dl>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-field bg-white px-3 py-2 text-sm">
              <span className="text-[#5b5e6e]">Dasar ketetapan pajak</span>
              <span className="text-right font-medium">PPN {percent(o.ppn_rate)} (UU Harmonisasi Perpajakan)</span>
            </div>
          </div>
        </div>

        {!paid && !refunded && (
          <p className="mb-4 rounded-field bg-[#fff7ed] p-3 text-sm text-[#7c2d12]">Belum dibayar. Selesaikan pembayaran lewat halaman pesanan.</p>
        )}

        {/* Tabel item: tabel di layar lebar, kartu di layar sempit */}
        <div className="mb-6">
          <SectionBar icon="inventory_2" title="Rincian Barang Kena Pajak (BKP)" right={`Tarif PPN ${percent(o.ppn_rate)} inklusif sistem`} color="#00288e" />
          <table className="hidden w-full border-collapse text-xs md:table print:table">
            <thead>
              <tr className="bg-[#dce9ff] text-left text-[10px] font-bold uppercase tracking-wider text-[#1a1b22]">
                <th className="px-2 py-2 text-center">No</th>
                <th className="px-2 py-2">Deskripsi barang &amp; penjual mitra</th>
                <th className="px-2 py-2">SKU / kode</th>
                <th className="px-2 py-2 text-center">Qty</th>
                <th className="px-2 py-2 text-center">Satuan</th>
                <th className="px-2 py-2 text-right">Harga (inc. PPN)</th>
                <th className="px-2 py-2 text-right">DPP (netto)</th>
                <th className="px-2 py-2 text-right">PPN {percent(o.ppn_rate)}</th>
                <th className="px-2 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i, idx) => (
                <tr key={i.id} className="border-b border-[#e4e3ee] align-top print:break-inside-avoid">
                  <td className="px-2 py-3 text-center font-mono text-[#5b5e6e]">{idx + 1}</td>
                  <td className="px-2 py-3">
                    <p className="m-0 font-display text-sm font-bold leading-snug">{i.product_name}</p>
                    <p className="m-0 mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[#5b5e6e]">
                      <span>{o.store_name ?? 'Penjual'}</span>
                      {o.store_npwp && <DocBadge className="bg-[#eff4ff] text-[#00288e]">PKP</DocBadge>}
                    </p>
                    {!i.is_taxable && <span className="text-[11px] text-[#5b5e6e]">(tidak kena PPN)</span>}
                  </td>
                  <td className="px-2 py-3 font-mono text-[11px] text-[#5b5e6e]">#{i.product_id}</td>
                  <td className="px-2 py-3 text-center font-mono font-bold">{i.qty}</td>
                  {/* DEMO */}
                  <td className="px-2 py-3 text-center text-[#5b5e6e]">{DEMO_DOC_UNIT}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{rp(i.unit_price)}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums text-[#5b5e6e]">
                    {i.is_taxable ? rp(lineDpp(i.line_subtotal)) : '—'}
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-[#00288e]">
                    {i.is_taxable ? rp(Number(i.line_subtotal) - lineDpp(i.line_subtotal)) : 'Non-PPN'}
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums">{rp(i.line_subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:hidden print:hidden">
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
        </div>

        {/* Rincian jasa ekspedisi (tidak kena PPN) */}
        <div className="mb-6 rounded-card bg-[#eff4ff] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[#00288e]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">local_shipping</span>
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">Rincian Jasa Ekspedisi Logistik Terintegrasi</span>
            </span>
            {/* DEMO */}
            <DocBadge className="bg-[#dce9ff] text-[#5b5e6e]">{DEMO_DOC_TAX_SCHEME}</DocBadge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-field bg-white p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded bg-[#dce9ff] font-mono text-xs font-bold text-[#00288e]">A</span>
                <span className="font-medium">
                  {o.courier ? `${o.courier.toUpperCase()} ${o.courier_service ?? ''}` : 'Kurir toko'}
                  {o.destination_label ? ` • Rute: ${o.destination_label}` : ''}
                </span>
              </div>
              <div className="flex flex-none items-center gap-3">
                <span className="font-mono text-[11px] text-[#5b5e6e]">Non-PPN</span>
                <span className="font-mono font-semibold">{rp(o.shipping_fee)}</span>
              </div>
            </div>
            {/* DEMO */}
            <div className="flex items-center justify-between gap-3 rounded-field bg-white p-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded bg-[#dce9ff] font-mono text-xs font-bold text-[#00288e]">B</span>
                <span className="font-medium">Proteksi asuransi pengiriman</span>
              </div>
              <span className="flex-none font-mono text-[11px] text-[#5b5e6e]">{DEMO_CHECKOUT_INSURANCE.note}</span>
            </div>
          </div>
        </div>

        {/* Terbilang dan rekap pajak */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-card bg-[#eff4ff] p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[#1a1b22]">
              <span className="material-symbols-outlined text-[18px] text-[#00288e]" aria-hidden="true">record_voice_over</span>
              <span className="font-display text-[11px] font-bold uppercase tracking-wider">Jumlah pembayaran terbilang:</span>
            </div>
            <p className="m-0 rounded-field bg-white p-3 font-display text-lg font-black italic leading-snug text-[#00288e]">
              “{terbilang(o.grand_total)}”
            </p>
            <div className="mt-3 space-y-1 text-xs text-[#5b5e6e]">
              <p className="m-0">• Harga sudah termasuk PPN.</p>
              <p className="m-0">• Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah.</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-card bg-[#eff4ff] p-4">
            <dl className="m-0 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Subtotal barang</dt><dd className="m-0 font-mono tabular-nums">{rp(o.subtotal)}</dd></div>
              {Number(o.discount_total) > 0 && (
                <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Diskon{o.promo_code ? ` (${o.promo_code})` : ''}</dt><dd className="m-0 font-mono tabular-nums">−{rp(o.discount_total)}</dd></div>
              )}
              {Number(o.dpp) > 0 && (
                <>
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Dasar pengenaan pajak (DPP barang)</dt><dd className="m-0 font-mono font-semibold tabular-nums">{rp(o.dpp)}</dd></div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-[#5b5e6e]">PPN {percent(o.ppn_rate)} (faktur pajak terpadu) <DocBadge className="bg-white text-[#00288e]">DJP</DocBadge></dt>
                    <dd className="m-0 font-mono font-semibold tabular-nums">{rp(o.ppn_total)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Biaya ekspedisi &amp; logistik (bebas PPN)</dt><dd className="m-0 font-mono font-semibold tabular-nums">{rp(o.shipping_fee)}</dd></div>
              {/* DEMO */}
              <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Biaya asuransi pengiriman</dt><dd className="m-0 font-mono text-[#5b5e6e]">{DEMO_CHECKOUT_INSURANCE.note}</dd></div>
            </dl>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-card bg-[#00288e] px-4 py-3 text-white">
              <div className="flex flex-col">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[#b8c4ff]">Total akhir tagihan</span>
                <span className="font-display text-base font-black tracking-tight">GRAND TOTAL</span>
              </div>
              <span className="font-mono text-xl font-black tabular-nums">{rp(o.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Footer dokumen: validasi QR, tanda tangan penerbit dan penerima */}
        <div className="rounded-card bg-[#eff4ff] p-4">
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-card bg-white p-3">
              {/* DEMO */}
              <DemoQr value={DEMO_QR_CODE} label="QR validasi DJP (dummy)" size={96} />
              <div className="min-w-0">
                <p className="m-0 flex items-center gap-1 font-display text-[11px] font-bold uppercase text-[#00288e]">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">qr_code_scanner</span>
                  QR Validasi DJP
                </p>
                <p className="m-0 mt-0.5 truncate font-mono text-[11px] text-[#5b5e6e]">NSFP: {DEMO_TAX_SERIES}</p>
                <p className="m-0 mt-1 text-[11px] leading-snug text-[#5b5e6e]">Pindai QR untuk verifikasi keabsahan faktur di portal resmi Ditjen Pajak RI.</p>
              </div>
            </div>
            <div className="rounded-card bg-white p-3">
              <SignatureBox
                title="Diterbitkan oleh & sah"
                name={o.store_name || 'Penjual'}
                tone="navy"
                sub={DEMO_DOC_SIGN.role}
                signature={
                  /* DEMO */
                  <span className="flex items-center gap-1.5 text-left leading-tight text-[#00288e]">
                    <span className="material-symbols-outlined text-[26px]" aria-hidden="true">verified_user</span>
                    <span>
                      <span className="block font-display text-[11px] font-black uppercase">Digitally signed</span>
                      <span className="block font-mono text-[9px] text-[#5b5e6e]">{DEMO_DOC_SIGN.ca}</span>
                    </span>
                  </span>
                }
              />
            </div>
            <div className="rounded-card bg-white p-3">
              <SignatureBox
                title="Penerima kuasa anggaran"
                name={o.buyer_name ?? 'Penerima'}
                tone="slate"
                signature={
                  /* DEMO */
                  <span className="flex items-center gap-1.5 rounded-field bg-[#dce9ff] px-2 py-1 text-left text-[#00288e]">
                    <span className="material-symbols-outlined text-[18px] text-[#ea580c]" aria-hidden="true">workspace_premium</span>
                    <span className="leading-none">
                      <span className="block font-display text-base font-black text-[#ea580c]">{DEMO_DOC_METERAI}</span>
                      <span className="block font-mono text-[9px] font-bold text-[#5b5e6e]">Meterai elektronik</span>
                    </span>
                  </span>
                }
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1 border-t border-[#c5c5d4] pt-2 font-mono text-[10px] text-[#5b5e6e] md:flex-row md:justify-between">
            {/* DEMO */}
            <span className="truncate">DOC-HASH: {DEMO_DOC_HASH}</span>
            <span>Dicetak secara otomatis melalui Sistem Tokoku pada {docDate(new Date().toISOString())}</span>
          </div>
        </div>

        {/* Keterangan dokumen */}
        <p className="mt-6 border-t border-[#e4e3ee] pt-3 text-[11px] text-[#5b5e6e]">
          Dokumen ini dicetak dari sistem Tokoku. Harga sudah termasuk PPN dan sah tanpa tanda tangan basah.
        </p>
      </Paper>

      <p className="mt-6 flex items-center gap-2 text-sm text-[#5b5e6e] print:hidden">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">lightbulb</span>
        Tips cetak: gunakan opsi “Simpan sebagai PDF” atau printer fisik dengan orientasi Portrait dan margin minimal (None/Default).
      </p>
    </section>
  );
}
