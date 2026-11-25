import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import type { Banner, BannerInput } from '../../api/types';
import {
  ACTIONS,
  CHECKBOX,
  EMPTY_ROW,
  FORM_CARD,
  HIDE_MD,
  HIDE_SM,
  HINT,
  INPUT,
  LABEL,
  LABEL_CHECK,
  MUTED_SMALL,
  Notice,
  ROW,
  SKU,
  StatusBadge,
  TABLE_WRAP,
  TBODY,
  TD,
  TH,
  btn,
  cx, TABLE_STACK } from './adminUi';

const empty: BannerInput = { title: '', subtitle: '', cta_label: '', cta_url: '', is_active: true, sort_order: 0 };

const FORM_TITLE = 'm-0 text-lg font-semibold text-ink';
const SECTION_RULE = 'mt-2 flex flex-col gap-3 border-t border-outline-soft pt-5';
const FILE_INPUT =
  'text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-field file:border-0 file:bg-secondary-container file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-secondary-container';

export default function AdminBanners() {
  const queryClient = useQueryClient();
  const banners = useQuery({ queryKey: ['admin-banners'], queryFn: api.adminBanners });
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
    queryClient.invalidateQueries({ queryKey: ['banners'] });
  };
  const fail = (e: unknown) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Terjadi kesalahan.' });

  const remove = useMutation({
    mutationFn: (id: number) => api.adminDeleteBanner(id),
    onSuccess: () => {
      setMessage({ kind: 'ok', text: 'Banner dihapus.' });
      refresh();
    },
    onError: fail,
  });

  return (
    <section>
      <PageHeader
        title="Banner promo"
        subtitle="Banner aktif tampil berurutan di katalog. Urutan kecil tampil lebih dulu. Gambar ideal 1600×600 px."
        actions={<button type="button" className={btn('primary')} onClick={() => setEditing('new')}>+ Banner baru</button>}
      />
      <p className={cx(MUTED_SMALL, 'mb-4')}>Banner aktif tampil berurutan di katalog (urutan kecil tampil lebih dulu). Gambar ideal 1600×600 px.</p>
      {message && <div className="mb-4"><Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice></div>}

      {editing && (
        <div className="mb-4">
          <BannerForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? empty : toInput(editing)}
            banner={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={(text) => {
              setMessage({ kind: 'ok', text });
              refresh();
            }}
            onError={fail}
          />
        </div>
      )}

      <div className={TABLE_WRAP}>
        <table className={TABLE_STACK}>
          <thead>
            <tr>
              <th className={TH}>Gambar</th>
              <th className={TH}>Judul</th>
              <th className={cx(TH, HIDE_MD)}>Tautan</th>
              <th className={cx(TH, HIDE_SM)}>Urutan</th>
              <th className={TH}>Status</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody className={TBODY}>
            {banners.data?.map((b) => (
              <tr key={b.id} className={b.is_active ? '' : 'bg-surface-low/60 text-muted'}>
                <td data-label="Gambar" className={TD}>
                  <span className="flex h-[45px] w-20 items-center justify-center overflow-hidden rounded-field bg-surface-high text-muted sm:h-[54px] sm:w-24">
                    {b.image_url ? <img src={b.image_url} alt="" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined" aria-hidden>image</span>}
                  </span>
                </td>
                <td data-label="Judul" className={TD}>
                  <strong className="font-semibold">{b.title}</strong>
                  {b.subtitle && <div className={MUTED_SMALL}>{b.subtitle}</div>}
                </td>
                <td data-label="Tautan" className={cx(TD, HIDE_MD, SKU)}>{b.cta_url ?? '—'}</td>
                <td data-label="Urutan" className={cx(TD, HIDE_SM, 'tabular-nums')}>{b.sort_order}</td>
                <td data-label="Status" className={TD}>
                  <StatusBadge tone={b.is_active ? 'ok' : 'neutral'}>{b.is_active ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                </td>
                <td data-label="" className={cx(TD, 'whitespace-nowrap')}>
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                    <button type="button" className={btn('link', 'link')} onClick={() => setEditing(b)}>Ubah</button>
                    <button
                      type="button"
                      className={btn('linkDanger', 'link')}
                      onClick={() => {
                        if (window.confirm(`Hapus banner "${b.title}"?`)) remove.mutate(b.id);
                      }}
                    >Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {banners.data?.length === 0 && <p className={EMPTY_ROW}>Belum ada banner. Katalog akan menampilkan banner bawaan.</p>}
      </div>
    </section>
  );
}

function toInput(b: Banner): BannerInput {
  return {
    title: b.title,
    subtitle: b.subtitle ?? '',
    cta_label: b.cta_label ?? '',
    cta_url: b.cta_url ?? '',
    is_active: b.is_active,
    sort_order: b.sort_order,
  };
}

function BannerForm({
  initial,
  banner,
  onClose,
  onSaved,
  onError,
}: {
  initial: BannerInput;
  banner: Banner | null;
  onClose: () => void;
  onSaved: (text: string) => void;
  onError: (e: unknown) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BannerInput>(initial);
  const [file, setFile] = useState<File | null>(null);
  const set = <K extends keyof BannerInput>(key: K, value: BannerInput[K]) => setForm({ ...form, [key]: value });

  const save = useMutation({
    mutationFn: () => (banner ? api.adminUpdateBanner(banner.id, form) : api.adminCreateBanner(form)),
    onSuccess: (saved) => {
      onSaved(banner ? 'Banner tersimpan.' : 'Banner dibuat. Unggah gambar di bagian bawah form.');
      if (!banner) onClose();
      queryClient.setQueryData(['admin-banner', saved.id], saved);
    },
    onError,
  });

  const upload = useMutation({
    mutationFn: () => api.adminUploadBannerImage(banner!.id, file as File),
    onSuccess: () => {
      setFile(null);
      onSaved('Gambar banner diunggah.');
    },
    onError,
  });

  return (
    <form
      className={FORM_CARD}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className={FORM_TITLE}>{banner ? 'Ubah banner' : 'Banner baru'}</h2>
      <label className={LABEL}>
        Judul
        <input className={INPUT} value={form.title} onChange={(e) => set('title', e.target.value)} required maxLength={120} />
      </label>
      <label className={LABEL}>
        Subjudul
        <input className={INPUT} value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} maxLength={255} />
      </label>
      <div className={ROW}>
        <label className={LABEL}>
          Teks tombol
          <input className={INPUT} value={form.cta_label ?? ''} onChange={(e) => set('cta_label', e.target.value)} maxLength={60} placeholder="Belanja sekarang" />
        </label>
        <label className={LABEL}>
          Tautan
          <input className={INPUT} value={form.cta_url ?? ''} onChange={(e) => set('cta_url', e.target.value)} maxLength={255} placeholder="/ atau https://…" />
        </label>
      </div>
      <div className={ROW}>
        <label className={LABEL}>
          Urutan tampil
          <input className={INPUT} type="number" value={form.sort_order ?? 0} onChange={(e) => set('sort_order', Number(e.target.value))} />
        </label>
        <label className={cx(LABEL_CHECK, 'sm:flex-none sm:self-end sm:pb-2.5')}>
          <input className={CHECKBOX} type="checkbox" checked={form.is_active ?? true} onChange={(e) => set('is_active', e.target.checked)} />
          Tampilkan di katalog
        </label>
      </div>
      <div className={ACTIONS}>
        <button type="submit" className={btn('primary')} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
        <button type="button" className={btn('ghost')} onClick={onClose}>Tutup</button>
      </div>

      {banner && (
        <div className={SECTION_RULE}>
          <h2 className={FORM_TITLE}>Gambar banner</h2>
          <p className={HINT}>JPEG, PNG, atau WebP, maksimal 2 MB. Tanpa gambar, banner memakai latar warna.</p>
          <div className={ACTIONS}>
            <input type="file" className={FILE_INPUT} accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" className={btn('default')} disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
              {upload.isPending ? 'Mengunggah…' : 'Unggah gambar'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
