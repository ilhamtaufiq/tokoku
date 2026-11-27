import { useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { SignaturePad } from '../components/SignaturePad';
import { DocToolbar, Paper, SignatureBox, docDate } from '../components/docs/shared';
import { formatDate } from '../lib/money';
import { useSeo } from '../lib/seo';

/** Berita acara serah terima. Pembeli mencatat dan menandatangani; penjual menanggapi kerusakan. */
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

  return (
    <section>
      <DocToolbar orderId={o.id} active="bast" />
      <Paper accent="#15803d">
        <header className="text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.25em] text-[#15803d]">Berita Acara</p>
          <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight">Serah Terima Barang</h1>
          <p className="m-0 font-mono text-sm">{o.invoice_no}</p>
        </header>

        {!doc && !shipped && (
          <p className="mt-8 rounded-md bg-[#f0fdf4] p-4 text-sm text-[#14532d]">BAST bisa dibuat setelah penjual mengirim pesanan.</p>
        )}

        {doc ? (
          <>
            <p className="mt-8 text-sm leading-relaxed">
              Pada tanggal <strong>{docDate(doc.created_at)}</strong>, pihak penerima <strong>{doc.received_by}</strong> menyatakan telah
              menerima barang dari penjual <strong>{o.store_name || '-'}</strong> dengan rincian sebagai berikut:
            </p>
            <table className="mt-5 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[#15803d] text-left text-[11px] uppercase tracking-wider text-[#5b5e6e]">
                  <th className="py-2 pr-2">No</th>
                  <th className="py-2 pr-2">Barang</th>
                  <th className="py-2 pr-2 text-right">Dipesan</th>
                  <th className="py-2 pr-2 text-right">Diterima baik</th>
                  <th className="py-2 text-right">Rusak</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.map((i, idx) => (
                  <tr key={i.order_item_id} className={`border-b border-[#e4e3ee] ${i.qty_damaged > 0 ? 'bg-[#fef2f2]' : ''}`}>
                    <td className="py-2.5 pr-2">{idx + 1}</td>
                    <td className="py-2.5 pr-2">{i.product_name}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{i.qty}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{i.qty_good}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold">{i.qty_damaged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doc.note && <p className="mt-4 text-sm"><span className="font-semibold">Catatan penerima:</span> {doc.note}</p>}
            <p className="mt-5 text-sm">Penerima menyatakan transaksi serah terima ini sah sesuai rincian di atas.</p>

            {damaged && (
              <div className="mt-6 rounded-md border border-[#fecaca] bg-[#fef2f2] p-4 text-sm">
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

            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              <SignatureBox title="Pihak penjual" name={o.store_name || 'Penjual'} />
              <div className="flex flex-col gap-1 text-center text-sm">
                <p className="m-0 font-semibold">Pihak penerima</p>
                {doc.signature_png ? (
                  <img src={doc.signature_png} alt={`Tanda tangan ${doc.received_by}`} className="mx-auto h-16 object-contain" />
                ) : (
                  <div className="h-16" />
                )}
                <div className="border-t border-[#1a1b22] pt-1">
                  <p className="m-0 font-semibold">{doc.received_by}</p>
                </div>
                <p className="m-0 text-xs text-[#5b5e6e]">{docDate(doc.created_at)}</p>
              </div>
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
                  <label className="flex items-center gap-2">
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
