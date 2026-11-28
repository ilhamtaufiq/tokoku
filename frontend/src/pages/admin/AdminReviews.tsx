import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { Stars } from '../../components/Reviews';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/money';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  EMPTY_TEXT,
  FormNotice,
  HIDE_LG,
  LINK_BTN,
  MUTED_SMALL,
  PANEL,
  StatusPill,
  TABLE_STACK,
  TD,
  TH,
  chipClass,
} from '@/components/admin-products/ui';
import { cn } from 'cn';

/** Moderasi ulasan: sembunyikan ulasan yang melanggar, tampilkan kembali jika perlu. */
export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviews = useQuery({
    queryKey: ['admin-reviews', hiddenOnly],
    queryFn: () => api.adminReviews(hiddenOnly),
  });

  const toggle = useMutation({
    mutationFn: ({ id, visible }: { id: number; visible: boolean }) => api.adminSetReviewVisible(id, visible),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Gagal mengubah ulasan.'),
  });

  return (
    <section>
      <PageHeader
        title="Ulasan"
        subtitle={reviews.data ? `${reviews.data.length} ulasan ditampilkan` : 'Memuat ulasan…'}
      />
      <Card className={cn(PANEL, 'mb-4 flex-col gap-3 p-3.5 md:flex-row md:flex-wrap md:items-center')}>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter ulasan">
          <Button type="button" variant="outline" className={chipClass(!hiddenOnly)} aria-pressed={!hiddenOnly} onClick={() => setHiddenOnly(false)}>Semua</Button>
          <Button type="button" variant="outline" className={chipClass(hiddenOnly)} aria-pressed={hiddenOnly} onClick={() => setHiddenOnly(true)}>Disembunyikan</Button>
        </div>
      </Card>
      {error && <div className="mb-4"><FormNotice kind="error">{error}</FormNotice></div>}
      <Card className={cn(PANEL, 'overflow-hidden')}>
        <Table className={TABLE_STACK}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={TH}>Produk</TableHead>
              <TableHead className={TH}>Rating</TableHead>
              <TableHead className={TH}>Ulasan</TableHead>
              <TableHead className={TH}>Pembeli</TableHead>
              <TableHead className={cn(TH, HIDE_LG)}>Tanggal</TableHead>
              <TableHead className={TH}>Status</TableHead>
              <TableHead className={TH} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reviews.data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell data-label="" className={cn(TD, 'font-medium max-md:block!')}>{r.product_name}</TableCell>
                <TableCell data-label="Rating" className={TD}><Stars value={r.rating} /></TableCell>
                <TableCell data-label="Ulasan" className={cn(TD, 'max-w-[320px] whitespace-normal break-words')}>
                  {r.comment || <span className={MUTED_SMALL}>(tanpa komentar)</span>}
                </TableCell>
                <TableCell data-label="Pembeli" className={TD}>{r.buyer_name}</TableCell>
                <TableCell data-label="Tanggal" className={cn(TD, HIDE_LG, MUTED_SMALL)}>{formatDate(r.created_at)}</TableCell>
                <TableCell data-label="Status" className={TD}>
                  <StatusPill tone={r.is_visible ? 'ok' : 'neutral'}>{r.is_visible ? 'Tampil' : 'Disembunyikan'}</StatusPill>
                </TableCell>
                <TableCell data-label="" className={cn(TD, 'whitespace-nowrap')}>
                  <Button
                    type="button"
                    variant="link"
                    className={LINK_BTN}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: r.id, visible: !r.is_visible })}
                  >
                    {r.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {reviews.data?.length === 0 && <p className={EMPTY_TEXT}>Belum ada ulasan.</p>}
      </Card>
    </section>
  );
}
