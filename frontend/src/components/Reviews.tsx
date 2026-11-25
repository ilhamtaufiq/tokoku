import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../lib/money';
import { useToast } from './Toast';
import { btnBase, btnPrimary, card, chipBase, chipIdle, chipOn, errorBox, fieldInput, label } from './ui/storefront';

export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="tracking-[1px] text-accent" aria-label={`${value} dari 5 bintang`}>
      {'★'.repeat(full)}
      <span className="text-outline-soft">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

/** Ringkasan rating, daftar ulasan, dan form ulasan untuk pembeli yang pesanannya sudah dikirim. */
export function ProductReviews({ productId }: { productId: number }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const summary = useQuery({ queryKey: ['reviews', productId], queryFn: () => api.reviews(productId) });
  const mine = useQuery({
    queryKey: ['reviews-me', productId],
    queryFn: () => api.myReview(productId),
    enabled: !!user,
  });

  const submit = useMutation({
    mutationFn: () => api.createReview(productId, rating, comment),
    onSuccess: () => {
      toast.show('Terima kasih, ulasan kamu sudah tersimpan.');
      setComment('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews-me', productId] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Ulasan gagal disimpan.'),
  });

  const data = summary.data;
  const own = mine.data;

  return (
    <section className={`${card} mt-6 flex flex-col gap-4 p-5 max-[760px]:p-4`} aria-labelledby="reviews-title">
      <div>
        <h2 id="reviews-title" className="m-0 mb-1 font-display text-lg font-semibold tracking-tight text-ink">
          Ulasan pembeli
        </h2>
        {data && data.average !== null ? (
          <p className="m-0 flex flex-wrap items-center gap-1.5 text-ink">
            <Stars value={data.average} /> <strong>{data.average.toFixed(1)}</strong>
            <span className="text-xs text-muted"> · {data.count} ulasan</span>
          </p>
        ) : (
          <p className="m-0 text-xs text-muted">Belum ada ulasan.</p>
        )}
      </div>

      {user && own?.can_review && (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            submit.mutate();
          }}
        >
          <p className={`${label} m-0`}>Beri penilaianmu</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                className={`${chipBase} min-w-[52px] justify-center ${rating === n ? chipOn : chipIdle}`}
                onClick={() => setRating(n)}
              >
                {n} ★
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Ulasan (opsional)</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ceritakan kualitas barang dan pengirimannya"
              className={`${fieldInput} resize-y`}
            />
          </label>
          {error && <p className={errorBox}>{error}</p>}
          <button
            className={`${btnBase} ${btnPrimary} w-fit justify-self-start`}
            disabled={submit.isPending}
          >
            {submit.isPending ? 'Menyimpan…' : 'Kirim ulasan'}
          </button>
        </form>
      )}

      {user && own?.review && (
        <p className="m-0 rounded-field bg-secondary-container px-3.5 py-2.5 text-sm text-on-secondary-container">
          Ulasan kamu: {'★'.repeat(own.review.rating)} {own.review.comment && `· ${own.review.comment}`}
        </p>
      )}
      {!user && (
        <p className="m-0 text-xs text-muted"><Link to="/login" className="font-semibold text-primary">Masuk</Link> lalu beli produk ini untuk memberi ulasan.</p>
      )}

      {data && data.items.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {data.items.map((r) => (
            <li key={r.id} className="border-t border-outline-soft pt-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Stars value={r.rating} />
                <strong className="font-semibold text-ink">{r.buyer_name}</strong>
                <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
              </div>
              {r.comment && <p className="m-0 mt-1.5 text-sm text-ink-2">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
