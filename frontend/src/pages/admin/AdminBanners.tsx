import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import type { Banner, BannerInput } from '../../api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BTN,
  CheckField,
  EMPTY_TEXT,
  FIELD,
  FILE_FIELD,
  FORM_BODY,
  FORM_TITLE,
  FormField,
  FormNotice,
  HIDE_MD,
  HIDE_SM,
  HINT,
  LINK_BTN,
  MUTED_SMALL,
  PANEL,
  ROW,
  SECTION_RULE,
  SKU,
  StatusPill,
  TABLE_STACK,
  TD,
  TH,
} from '@/components/admin-products/ui';
import { cn } from 'cn';

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
      <PageHeader
        title="Banner promo"
        subtitle="Banner aktif tampil berurutan di katalog. Urutan kecil tampil lebih dulu. Gambar ideal 1600×600 px."
        actions={<Button type="button" className={BTN} onClick={() => setEditing('new')}>+ Banner baru</Button>}
      />
      <p className={cn(MUTED_SMALL, 'mb-4')}>Banner aktif tampil berurutan di katalog (urutan kecil tampil lebih dulu). Gambar ideal 1600×600 px.</p>
      {message && <div className="mb-4"><FormNotice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</FormNotice></div>}

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

      <Card className={cn(PANEL, 'overflow-hidden')}>
        <Table className={TABLE_STACK}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={TH}>Gambar</TableHead>
              <TableHead className={TH}>Judul</TableHead>
              <TableHead className={cn(TH, HIDE_MD)}>Tautan</TableHead>
              <TableHead className={cn(TH, HIDE_SM)}>Urutan</TableHead>
              <TableHead className={TH}>Status</TableHead>
              <TableHead className={TH} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.data?.map((b) => (
              <TableRow key={b.id} className={b.is_active ? '' : 'bg-surface-low/60 text-sub'}>
                <TableCell data-label="" className={cn(TD, 'max-md:block!')}>
                  <span className="flex h-[45px] w-20 items-center justify-center overflow-hidden rounded-lg bg-surface-high text-sub sm:h-[54px] sm:w-24">
                    {b.image_url ? <img src={b.image_url} alt="" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined" aria-hidden>image</span>}
                  </span>
                </TableCell>
                <TableCell data-label="Judul" className={TD}>
                  <strong className="font-semibold">{b.title}</strong>
                  {b.subtitle && <div className={MUTED_SMALL}>{b.subtitle}</div>}
                </TableCell>
                <TableCell data-label="Tautan" className={cn(TD, HIDE_MD, SKU)}>{b.cta_url ?? '—'}</TableCell>
                <TableCell data-label="Urutan" className={cn(TD, HIDE_SM, 'tabular-nums')}>{b.sort_order}</TableCell>
                <TableCell data-label="Status" className={TD}>
                  <StatusPill tone={b.is_active ? 'ok' : 'neutral'}>{b.is_active ? 'Aktif' : 'Nonaktif'}</StatusPill>
                </TableCell>
                <TableCell data-label="" className={cn(TD, 'whitespace-nowrap')}>
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center">
                    <Button type="button" variant="link" className={LINK_BTN} onClick={() => setEditing(b)}>Ubah</Button>
                    <Button
                      type="button"
                      variant="link"
                      className={cn(LINK_BTN, 'text-destructive')}
                      onClick={() => {
                        if (window.confirm(`Hapus banner "${b.title}"?`)) remove.mutate(b.id);
                      }}
                    >Hapus</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {banners.data?.length === 0 && <p className={EMPTY_TEXT}>Belum ada banner. Katalog akan menampilkan banner bawaan.</p>}
      </Card>
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
    <Card className={PANEL}>
      <form
        className={FORM_BODY}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <h2 className={FORM_TITLE}>{banner ? 'Ubah banner' : 'Banner baru'}</h2>
        <FormField label="Judul">
          <Input className={FIELD} value={form.title} onChange={(e) => set('title', e.target.value)} required maxLength={120} />
        </FormField>
        <FormField label="Subjudul">
          <Input className={FIELD} value={form.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} maxLength={255} />
        </FormField>
        <div className={ROW}>
          <FormField label="Teks tombol">
            <Input className={FIELD} value={form.cta_label ?? ''} onChange={(e) => set('cta_label', e.target.value)} maxLength={60} placeholder="Belanja sekarang" />
          </FormField>
          <FormField label="Tautan">
            <Input className={FIELD} value={form.cta_url ?? ''} onChange={(e) => set('cta_url', e.target.value)} maxLength={255} placeholder="/ atau https://…" />
          </FormField>
        </div>
        <div className={ROW}>
          <FormField label="Urutan tampil">
            <Input className={FIELD} type="number" value={form.sort_order ?? 0} onChange={(e) => set('sort_order', Number(e.target.value))} />
          </FormField>
          <CheckField
            className="sm:flex-none sm:self-end sm:pb-2.5"
            checked={form.is_active ?? true}
            onCheckedChange={(v) => set('is_active', v)}
          >
            Tampilkan di katalog
          </CheckField>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" className={BTN} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</Button>
          <Button type="button" variant="ghost" className={BTN} onClick={onClose}>Tutup</Button>
        </div>

        {banner && (
          <div className={SECTION_RULE}>
            <h2 className={FORM_TITLE}>Gambar banner</h2>
            <p className={HINT}>JPEG, PNG, atau WebP, maksimal 2 MB. Tanpa gambar, banner memakai latar warna.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input type="file" className={FILE_FIELD} accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Button type="button" variant="outline" className={BTN} disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                {upload.isPending ? 'Mengunggah…' : 'Unggah gambar'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
