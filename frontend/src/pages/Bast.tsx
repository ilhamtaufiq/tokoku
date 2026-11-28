import { useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { SignaturePad } from '../components/SignaturePad';
import { DocBanner, DocToolbar, MiniLabel, Paper, SignatureBox, docDate } from '../components/docs/shared';
import { formatDate } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Berita acara serah terima. Pembeli mencatat dan menandatangani; penjual menanggapi kerusakan. Identitas warna: hijau. */
export default function Bast() {
  useSeo({ title: 'BAST', noindex: true });
  const { id } = useParams();
  const orderId = Number(id);
  const { user } = useAuth();
  const isSeller = user?.role === 'seller';
  const isBuyer = user?.role === 'customer';
  const queryClient = useQueryClient();
  // Penjual tidak punya akses ke /orders/:id milik pembeli, jadi datanya dari panel admin
  const order = useQuery({
    queryKey: ['bast-order', orderId, isSeller],
    queryFn: () => (isSeller ? api.adminOrder(orderId) : api.order(orderId)),
  });
  const bast = useQuery({ queryKey: ['bast', orderId], queryFn: () => api.bast(orderId) });
  const [receivedBy, setReceivedBy] = useState('');
  const [note, setNote] = useState('');
  const [good, setGood] = useState<Record<number, number>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [sellerNote, setSellerNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createBast(orderId, {
        received_by: receivedBy.trim(),
        note: note.trim(),
        signature_png: signature ?? '',
        items: (order.data?.items ?? []).map((i) => {
          const qtyGood = good[i.id] ?? i.qty;
          return { order_item_id: i.id, qty_good: qtyGood, qty_damaged: i.qty - qtyGood };
        }),
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['bast', orderId] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'BAST gagal disimpan.'),
  });

  const respond = useMutation({
    mutationFn: () => api.sellerBastResponse(orderId, sellerNote.trim()),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['bast', orderId] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Tanggapan gagal disimpan.'),
  });

  if (order.isPending || bast.isPending) return <p className="text-muted">Memuat BAST…</p>;
  if (order.isError || !order.data) return <p className="text-error">Pesanan tidak ditemukan.</p>;
  const o = order.data;
  const doc = bast.data;
  const shipped = o.status === 'shipped' || o.status === 'completed';
  const damaged = doc?.items.some((i) => i.qty_damaged > 0) ?? false;
  const totalDamaged = doc?.items.reduce((sum, i) => sum + i.qty_damaged, 0) ?? 0;
  const totalPhysical = doc?.items.reduce((sum, i) => sum + i.qty, 0) ?? 0;
  const bastNo = doc ? `BAST-${String(doc.id).padStart(5, '0')}` : '';

  return (
    <section>
      <DocToolbar orderId={o.id} active="bast" />
      <DocBanner
        icon="verified_user"
        title="Berita acara serah terima"
        actions={
          <>
            {doc && (
              <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 text-sm font-semibold text-on-primary" onClick={() => window.print()}>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">print</span>
                Cetak lembar BAST
              </button>
            )}
            {doc && (
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-[#dce9ff] px-4 text-sm font-semibold text-[#1a1b22]"
                onClick={() => {
                  void navigator.clipboard?.writeText(bastNo).catch(() => undefined);
                }}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
                Salin no. BAST
              </button>
            )}
          </>
        }
      />

      <Paper accent="#15803d">
        {/* Kepala: judul berita acara */}
        <header className="border-b border-[#bbf7d0] pb-6">
          <div className="mt-6 text-center">
            <p className="m-0 font-display text-xs font-bold uppercase tracking-[0.25em] text-[#15803d]">Berita acara</p>
            <h1 className="mt-1 font-display text-[22px] font-black leading-tight tracking-tight text-[#1a1b22] sm:text-[26px]">
              Berita Acara Serah Terima Barang (BAST)
            </h1>
            <p className="m-0 mt-2 font-mono text-sm font-semibold">{o.invoice_no}</p>
          </div>
        </header>

        {!doc && !shipped && (
          <p className="mt-8 rounded-field bg-[#f0fdf4] p-4 text-sm text-[#14532d]">BAST bisa dibuat setelah penjual mengirim pesanan.</p>
        )}

        {doc ? (
          <>
            {/* Dua kartu identitas: administrasi dan satuan pendidikan penerima */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-card bg-[#f0fdf4] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#14532d]">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">description</span>
                    Identitas administrasi
                  </span>
                </div>
                <dl className="m-0 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Nomor dokumen</dt><dd className="m-0 font-mono font-semibold">{bastNo}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Tanggal pemeriksaan</dt><dd className="m-0 text-right font-semibold">{docDate(doc.created_at)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">No. invoice</dt><dd className="m-0 font-mono">{o.invoice_no}</dd></div>
                </dl>
              </div>
              <div className="rounded-card bg-[#f0fdf4] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-[#14532d]">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">school</span>
                    Penerima
                  </span>
                </div>
                <dl className="m-0 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Nama penerima</dt><dd className="m-0 text-right font-semibold">{o.buyer_name ?? '-'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Alamat pengiriman</dt><dd className="m-0 max-w-[60%] text-right">{o.shipping_address}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[#5b5e6e]">Penyedia terpilih</dt><dd className="m-0 text-right">{o.store_name || '-'}</dd></div>
                </dl>
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed">
              Pada tanggal <strong>{docDate(doc.created_at)}</strong>, pihak penerima <strong>{doc.received_by}</strong> menyatakan telah
              menerima barang dari penjual <strong>{o.store_name || '-'}</strong> dengan rincian sebagai berikut:
            </p>

            {/* Tabel barang: tabel di layar lebar, kartu di layar sempit */}
            <div className="mt-4">
              <table className="hidden w-full border-collapse text-xs md:table print:table">
                <thead>
                  <tr className="bg-[#14532d] text-left text-[10px] font-bold uppercase tracking-wider text-white">
                    <th className="px-2 py-2.5 font-bold">No</th>
                    <th className="px-2 py-2.5 font-bold">Nama barang &amp; spesifikasi teknis</th>
                    <th className="px-2 py-2.5 text-right font-bold">Qty dipesan</th>
                    <th className="bg-[#166534] px-2 py-2.5 text-right font-bold">Qty baik (diterima)</th>
                    <th className="px-2 py-2.5 text-right font-bold">Qty rusak</th>
                    <th className="px-2 py-2.5 font-bold">Status uji fungsi</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((i, idx) => (
                    <tr key={i.order_item_id} className={`border-b border-[#dcfce7] align-top print:break-inside-avoid ${i.qty_damaged > 0 ? 'bg-[#fef2f2]' : ''}`}>
                      <td className="px-2 py-3 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-2 py-3">
                        <p className="m-0 font-display text-sm font-bold leading-snug">{i.product_name}</p>
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums">{i.qty} unit</td>
                      <td className="bg-[#f0fdf4] px-2 py-3 text-right font-mono font-bold tabular-nums">{i.qty_good} unit</td>
                      <td className="px-2 py-3 text-right font-mono font-bold tabular-nums">{i.qty_damaged} unit</td>
                      <td className="px-2 py-3">
                        <span className={`inline-block rounded-pill px-2 py-1 text-[11px] font-semibold ${i.qty_damaged > 0 ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                          {i.qty_damaged > 0 ? 'Ada barang rusak' : 'Lolos uji fungsi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:hidden print:hidden">
                {doc.items.map((i, idx) => (
                  <li key={i.order_item_id} className={`rounded-field border border-[#dcfce7] p-3 text-sm ${i.qty_damaged > 0 ? 'bg-[#fef2f2]' : ''}`}>
                    <p className="m-0 font-semibold">
                      <span className="font-mono text-xs text-[#5b5e6e]">{idx + 1}.</span> {i.product_name}
                    </p>
                    <dl className="m-0 mt-2 grid grid-cols-3 gap-2 text-right">
                      <div>
                        <dt><MiniLabel>Dipesan</MiniLabel></dt>
                        <dd className="m-0 font-mono tabular-nums">{i.qty}</dd>
                      </div>
                      <div>
                        <dt><MiniLabel>Diterima baik</MiniLabel></dt>
                        <dd className="m-0 font-mono tabular-nums">{i.qty_good}</dd>
                      </div>
                      <div>
                        <dt><MiniLabel>Rusak</MiniLabel></dt>
                        <dd className="m-0 font-mono font-bold tabular-nums">{i.qty_damaged}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-1 rounded-b-card bg-[#f0fdf4] p-3 text-xs text-[#14532d] md:flex-row md:justify-between">
                <span>
                  Hasil pemeriksaan fisik: {totalDamaged > 0 ? `terdapat ${totalDamaged} unit rusak.` : '100% lengkap, baru, tanpa cacat atau malfungsi.'}
                </span>
                <span className="font-mono text-[#5b5e6e]">Total item: {doc.items.length} kelompok barang ({totalPhysical} kuantitas fisik)</span>
              </div>
            </div>

            {doc.note && <p className="mt-4 text-sm"><span className="font-semibold">Catatan penerima:</span> {doc.note}</p>}
            <p className="mt-5 text-sm">Penerima menyatakan transaksi serah terima ini sah sesuai rincian di atas.</p>

            {/* Tanggapan penjual dan komitmen garansi */}
            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="rounded-card bg-[#f0fdf4] p-4 text-sm">
                <p className="m-0 mb-1 font-display text-[11px] font-bold uppercase tracking-wider text-[#14532d]">Tanggapan penjual &amp; komitmen garansi purna jual</p>
                {damaged && (
                  <div className="mt-2 rounded-field border border-[#fecaca] bg-[#fef2f2] p-3">
                    <p className="m-0 mb-1 font-semibold text-[#991b1b]">Tindak lanjut penjual atas barang rusak</p>
                    {doc.seller_note ? (
                      <p className="m-0">
                        {doc.seller_note}
                        {doc.seller_responded_at && <span className="block text-xs text-[#5b5e6e]">Ditanggapi {formatDate(doc.seller_responded_at)}</span>}
                      </p>
                    ) : isSeller ? (
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setError(null);
                          respond.mutate();
                        }}
                      >
                        <textarea rows={3} minLength={5} maxLength={500} required className="rounded-field border border-outline bg-white px-3 py-2 text-[#1a1b22]"
                          value={sellerNote} onChange={(e) => setSellerNote(e.target.value)} placeholder="Misalnya: barang pengganti dikirim hari ini" />
                        <button className="h-9 self-start rounded-pill bg-[#991b1b] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={respond.isPending}>
                          {respond.isPending ? 'Menyimpan…' : 'Simpan tanggapan'}
                        </button>
                      </form>
                    ) : (
                      <p className="m-0 text-[#5b5e6e]">Belum ada tanggapan dari penjual.</p>
                    )}
                    {error && <p className="m-0 mt-2 text-sm text-[#991b1b]">{error}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Tanda tangan: penjual, penerima, dan pejabat yang mengetahui */}
            <p className="mb-4 mt-8 text-center font-display text-sm font-bold uppercase tracking-wider text-[#14532d]">Pengesahan berita acara serah terima fisik barang</p>
            <div className="grid gap-6 md:grid-cols-3 print:break-inside-avoid">
              <SignatureBox title="Pihak penjual" name={o.store_name || 'Penjual'} tone="green" />
              <SignatureBox
                title="Pihak penerima"
                name={doc.received_by}
                dateLabel={docDate(doc.created_at)}
                tone="green"
                signature={
                  doc.signature_png ? (
                    <img src={doc.signature_png} alt={`Tanda tangan ${doc.received_by}`} className="mx-auto h-16 max-w-full object-contain" />
                  ) : null
                }
              />
            </div>
          </>
        ) : shipped && isBuyer ? (
          <form
            className="mt-8 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              create.mutate();
            }}
          >
            <p className="m-0 text-sm text-[#5b5e6e]">Isi jumlah barang yang diterima dalam kondisi baik. Sisanya dicatat sebagai rusak.</p>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Nama penerima
              <input required minLength={3} maxLength={120} className="rounded-field border border-outline bg-surface px-3 py-2.5 font-normal text-ink"
                value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
            </label>
            <div className="flex flex-col gap-3">
              {o.items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-outline-soft p-3 text-sm">
                  <span className="font-semibold">{i.product_name} <span className="font-normal text-muted">· dipesan {i.qty}</span></span>
                  <label className="!flex !flex-row items-center gap-2">
                    Diterima baik
                    <input type="number" min={0} max={i.qty} className="w-20 rounded-field border border-outline bg-surface px-2 py-1.5 text-ink"
                      value={good[i.id] ?? i.qty} onChange={(e) => setGood({ ...good, [i.id]: Math.min(i.qty, Math.max(0, Number(e.target.value))) })} />
                  </label>
                </div>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Catatan (opsional)
              <textarea rows={3} maxLength={500} className="rounded-field border border-outline bg-surface px-3 py-2.5 font-normal text-ink"
                value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misalnya: satu kardus penyok" />
            </label>
            <div className="flex flex-col gap-2 text-sm font-semibold">
              Tanda tangan penerima
              <SignaturePad onChange={setSignature} />
            </div>
            {error && <p className="m-0 rounded-field bg-error-soft px-3 py-2 text-sm text-on-error-soft">{error}</p>}
            <button className="h-11 rounded-pill bg-[#15803d] font-semibold text-white disabled:opacity-50" disabled={create.isPending || !signature}>
              {create.isPending ? 'Menyimpan…' : 'Buat BAST'}
            </button>
            <p className="m-0 text-xs text-muted">BAST hanya bisa dibuat sekali.</p>
          </form>
        ) : null}
      </Paper>
    </section>
  );
}
