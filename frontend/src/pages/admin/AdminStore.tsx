import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import type { StoreInfo } from '../../api/types';
import { CARD, CHECKBOX, DEMO_TAG, FORM_CARD, HINT, INPUT, LABEL, LABEL_CHECK, MONEY, MUTED_SMALL, Notice, SKU, StatusBadge, TABLE_STACK, TBODY, TD, TD_MONEY, TH, btn, cx } from './adminUi';
import { rp } from '../../lib/money';
import { DEMO_ESCROW } from '../../data/demo';
import { DestinationSearch } from '../../components/DestinationSearch';
import type { ShippingDestination } from '../../api/types';

export default function AdminStore() {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ['admin-store'], queryFn: api.adminStore });
  // Draft hanya terisi saat pengguna mengetik; sebelum itu nilai diambil langsung dari server.
  const base: StoreInfo = store.data ?? { name: '', npwp: '', address: '', phone: '', origin_location_id: null, origin_label: null };
  const [draft, setDraft] = useState<StoreInfo | null>(null);
  const form = draft ?? base;
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const save = useMutation({
    mutationFn: () => api.adminUpdateStore(form),
    onSuccess: (saved) => {
      setDraft(saved);
      setMessage({ kind: 'ok', text: 'Data toko tersimpan. Akan muncul di invoice berikutnya.' });
      queryClient.invalidateQueries({ queryKey: ['store'] });
    },
    onError: (e) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Gagal menyimpan.' }),
  });

  const set = (key: keyof StoreInfo, value: string) => setDraft({ ...form, [key]: value });

  if (store.isPending) return <p className="text-muted">Memuat data toko…</p>;

  return (
    <section>
      <PageHeader
        crumbs={['Portal penjual', 'Fiskal & rekening', 'Data toko']}
        title="Data toko"
        subtitle="Data ini dicetak di invoice. Isi NPWP dan alamat sesuai dokumen perpajakan toko."
        actions={
          /* DEMO: unduh sertifikat belum punya API, jadi nonaktif. */
          <button type="button" className={btn('default')} disabled title="Belum tersedia">
            <span className="material-symbols-outlined" aria-hidden>download</span>
            Unduh sertifikat (PDF)
            <span className={DEMO_TAG}>Demo</span>
          </button>
        }
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        className={FORM_CARD}
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          save.mutate();
        }}
      >
        <label className={LABEL}>
          Nama toko
          <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} required maxLength={120} />
        </label>
        <label className={LABEL}>
          <span>NPWP toko <span className={HINT}>(15 atau 16 digit)</span></span>
          <input className={INPUT} value={form.npwp} onChange={(e) => set('npwp', e.target.value)} placeholder="01.234.567.8-901.000" />
        </label>
        <label className={LABEL}>
          Alamat
          <textarea className={INPUT} rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </label>
        <label className={LABEL}>
          Telepon
          <input className={INPUT} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label className={LABEL}>
          <span>Lokasi asal pengiriman <span className={HINT}>(untuk cek ongkir)</span></span>
          <DestinationSearch
            id="origin-search"
            value={form.origin_location_id && form.origin_label ? { id: form.origin_location_id, label: form.origin_label } : null}
            onChange={(dest: ShippingDestination | null) =>
              setDraft({ ...form, origin_location_id: dest?.id ?? null, origin_label: dest?.label ?? null })
            }
          />
        </label>
        {message && <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>}
        <button type="submit" className={btn('primary', 'md', 'w-full')} disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan'}
        </button>
      </form>

      <div className="flex min-w-0 flex-col gap-4">
        {/* DEMO: saldo escrow dummy, hanya tampilan. */}
        <div className="grid grid-cols-2 gap-3">
          <article className={cx(CARD, 'flex flex-col gap-1 p-4')}>
            <span className="text-xs font-semibold text-muted">Saldo siap ditarik</span>
            <strong className={cx(MONEY, 'text-lg font-bold text-ink sm:text-xl')}>{rp(DEMO_ESCROW.available)}</strong>
            <span className={DEMO_TAG}>Demo</span>
          </article>
          <article className={cx(CARD, 'flex flex-col gap-1 p-4')}>
            <span className="text-xs font-semibold text-muted">Dana escrow tertahan</span>
            <strong className={cx(MONEY, 'text-lg font-bold text-ink sm:text-xl')}>{rp(DEMO_ESCROW.held)}</strong>
            <span className={MUTED_SMALL}>{DEMO_ESCROW.heldPendingCount} pesanan menunggu konfirmasi</span>
            <span className={DEMO_TAG}>Demo</span>
          </article>
        </div>

        {/* DEMO: pengaturan rekening escrow hanya tampilan. Tidak ada API, jadi tidak tersimpan dan tombol nonaktif. */}
        <form className={FORM_CARD} onSubmit={(e) => e.preventDefault()} aria-label="Pengaturan rekening escrow">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-lg font-semibold text-ink">Rekening escrow</h2>
            <span className={DEMO_TAG}>Demo</span>
          </div>
          <label className={LABEL}>
            Bank
            <input className={INPUT} value={DEMO_ESCROW.bankName} readOnly />
          </label>
          <label className={LABEL}>
            Nama pemilik rekening
            <input className={INPUT} value={DEMO_ESCROW.accountHolder} readOnly />
          </label>
          <label className={LABEL}>
            Nomor rekening
            <input className={cx(INPUT, MONEY)} value={DEMO_ESCROW.accountMasked} readOnly />
          </label>
          <label className={LABEL_CHECK}>
            <input className={CHECKBOX} type="checkbox" checked={DEMO_ESCROW.autoDisburse} readOnly />
            Pencairan otomatis setelah BAST ditandatangani
          </label>
          <p className={HINT}>Tampilan contoh. Perubahan rekening escrow belum bisa disimpan dari layar ini.</p>
          <button type="button" className={btn('primary', 'md', 'w-full')} disabled>Simpan rekening (belum tersedia)</button>
        </form>

      </div>
      </div>
      <div className="mt-4">
        {/* DEMO: riwayat mutasi dummy. */}
        <article className={cx(CARD, 'overflow-hidden')}>
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <h2 className="m-0 text-lg font-semibold text-ink">Mutasi pencairan terakhir</h2>
            <span className={DEMO_TAG}>Demo</span>
          </div>
          <table className={TABLE_STACK}>
            <thead>
              <tr>
                <th className={TH}>Waktu</th>
                <th className={TH}>Satuan pendidikan</th>
                <th className={cx(TH, 'text-right')}>Nilai</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className={TBODY}>
              {DEMO_ESCROW.mutations.map((m) => (
                <tr key={m.ref}>
                  <td data-label="Waktu" className={cx(TD, MUTED_SMALL)}>{m.at}</td>
                  <td data-label="Satuan" className={cx(TD, 'text-left')}>
                    <span className="block font-medium">{m.buyer}</span>
                    <span className={cx(SKU, 'block truncate')}>{m.ref}</span>
                  </td>
                  <td data-label="Nilai" className={TD_MONEY}>{rp(m.amount)}</td>
                  <td data-label="Status" className={TD}><StatusBadge tone="ok">{m.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}
