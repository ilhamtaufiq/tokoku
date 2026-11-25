import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { Banner, BannerInput } from '../../api/types';

const empty: BannerInput = { title: '', subtitle: '', cta_label: '', cta_url: '', is_active: true, sort_order: 0 };

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
      <div className="toolbar">
        <h1>Banner promo</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>+ Banner baru</button>
      </div>
      <p className="muted small">Banner aktif tampil berurutan di katalog (urutan kecil tampil lebih dulu). Gambar ideal 1600×600 px.</p>
      {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}

      {editing && (
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
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Gambar</th><th>Judul</th><th>Tautan</th><th>Urutan</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {banners.data?.map((b) => (
              <tr key={b.id} className={b.is_active ? '' : 'muted'}>
                <td>
                  <span className="banner-thumb">
                    {b.image_url ? <img src={b.image_url} alt="" /> : <span className="material-symbols-outlined" aria-hidden>image</span>}
                  </span>
                </td>
                <td><strong>{b.title}</strong>{b.subtitle && <div className="muted small">{b.subtitle}</div>}</td>
                <td className="sku">{b.cta_url ?? '—'}</td>
                <td>{b.sort_order}</td>
                <td>{b.is_active ? 'Aktif' : 'Nonaktif'}</td>
                <td className="actions">
                  <button className="btn link" onClick={() => setEditing(b)}>Ubah</button>
                  <button
                    className="btn link danger"
                    onClick={() => {
                      if (window.confirm(`Hapus banner "${b.title}"?`)) remove.mutate(b.id);
                    }}
                  >Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {banners.data?.length === 0 && <p className="muted center">Belum ada banner. Katalog akan menampilkan banner bawaan.</p>}
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
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2>{banner ? 'Ubah banner' : 'Banner baru'}</h2>
      <label>
        Judul
        <input value={form.title} onChange={(e) => set('title', e.target.value)} required maxLength={120} />
      </label>
      <label>
        Subjudul
        <input value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} maxLength={255} />
      </label>
      <div className="row">
        <label>
          Teks tombol
          <input value={form.cta_label ?? ''} onChange={(e) => set('cta_label', e.target.value)} maxLength={60} placeholder="Belanja sekarang" />
        </label>
        <label>
          Tautan
          <input value={form.cta_url ?? ''} onChange={(e) => set('cta_url', e.target.value)} maxLength={255} placeholder="/ atau https://…" />
        </label>
      </div>
      <div className="row">
        <label>
          Urutan tampil
          <input type="number" value={form.sort_order ?? 0} onChange={(e) => set('sort_order', Number(e.target.value))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => set('is_active', e.target.checked)} />
          Tampilkan di katalog
        </label>
      </div>
      <div className="actions">
        <button className="btn primary" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
        <button type="button" className="btn ghost" onClick={onClose}>Tutup</button>
      </div>

      {banner && (
        <div className="image-upload">
          <h2>Gambar banner</h2>
          <p className="muted small">JPEG, PNG, atau WebP, maksimal 2 MB. Tanpa gambar, banner memakai latar warna.</p>
          <div className="actions">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" className="btn" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
              {upload.isPending ? 'Mengunggah…' : 'Unggah gambar'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
