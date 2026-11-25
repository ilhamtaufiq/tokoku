import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { Stars } from '../../components/Reviews';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import { formatDate } from '../../lib/money';

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
      <div className="filter-bar card">
        <div className="chip-group" role="group" aria-label="Filter ulasan">
          <button className={`chip ${!hiddenOnly ? 'on' : ''}`} aria-pressed={!hiddenOnly} onClick={() => setHiddenOnly(false)}>Semua</button>
          <button className={`chip ${hiddenOnly ? 'on' : ''}`} aria-pressed={hiddenOnly} onClick={() => setHiddenOnly(true)}>Disembunyikan</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Produk</th><th>Pembeli</th><th>Rating</th><th>Ulasan</th><th>Tanggal</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {(reviews.data ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.product_name}</td>
                <td>{r.buyer_name}</td>
                <td><Stars value={r.rating} /></td>
                <td className="review-cell">{r.comment || <span className="muted small">(tanpa komentar)</span>}</td>
                <td>{formatDate(r.created_at)}</td>
                <td>{r.is_visible ? 'Tampil' : 'Disembunyikan'}</td>
                <td className="actions">
                  <button className="btn link" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: r.id, visible: !r.is_visible })}>
                    {r.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.data?.length === 0 && <p className="muted center">Belum ada ulasan.</p>}
      </div>
    </section>
  );
}
