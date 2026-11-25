import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { Stars } from '../../components/Reviews';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/money';
import { CHIP_GROUP, EMPTY_ROW, FILTER_BAR, HIDE_LG, MUTED_SMALL, Notice, StatusBadge, TABLE_WRAP, TBODY, TD, TH, btn, chipClass, cx, TABLE_STACK } from './adminUi';

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
      <div className={FILTER_BAR}>
        <div className={CHIP_GROUP} role="group" aria-label="Filter ulasan">
          <button type="button" className={chipClass(!hiddenOnly)} aria-pressed={!hiddenOnly} onClick={() => setHiddenOnly(false)}>Semua</button>
          <button type="button" className={chipClass(hiddenOnly)} aria-pressed={hiddenOnly} onClick={() => setHiddenOnly(true)}>Disembunyikan</button>
        </div>
      </div>
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      <div className={TABLE_WRAP}>
        <table className={TABLE_STACK}>
          <thead>
            <tr>
              <th className={TH}>Produk</th>
              <th className={TH}>Rating</th>
              <th className={TH}>Ulasan</th>
              <th className={TH}>Pembeli</th>
              <th className={cx(TH, HIDE_LG)}>Tanggal</th>
              <th className={TH}>Status</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody className={TBODY}>
            {(reviews.data ?? []).map((r) => (
              <tr key={r.id}>
                <td data-label="Produk" className={cx(TD, 'font-medium')}>{r.product_name}</td>
                <td data-label="Rating" className={TD}><Stars value={r.rating} /></td>
                <td data-label="Ulasan" className={cx(TD, 'max-w-[320px] whitespace-normal break-words')}>
                  {r.comment || <span className={MUTED_SMALL}>(tanpa komentar)</span>}
                </td>
                <td data-label="Pembeli" className={TD}>{r.buyer_name}</td>
                <td data-label="Tanggal" className={cx(TD, HIDE_LG, MUTED_SMALL)}>{formatDate(r.created_at)}</td>
                <td data-label="Status" className={TD}>
                  <StatusBadge tone={r.is_visible ? 'ok' : 'neutral'}>{r.is_visible ? 'Tampil' : 'Disembunyikan'}</StatusBadge>
                </td>
                <td data-label="" className={cx(TD, 'whitespace-nowrap')}>
                  <button
                    type="button"
                    className={btn('link', 'link')}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: r.id, visible: !r.is_visible })}
                  >
                    {r.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.data?.length === 0 && <p className={EMPTY_ROW}>Belum ada ulasan.</p>}
      </div>
    </section>
  );
}
