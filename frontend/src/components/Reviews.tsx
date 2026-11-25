import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../lib/money';
import { useToast } from './Toast';

export function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} dari 5 bintang`}>
      {'★'.repeat(full)}
      <span className="stars-empty">{'★'.repeat(5 - full)}</span>
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
    <section className="reviews card" aria-labelledby="reviews-title">
      <div className="reviews-head">
        <h2 id="reviews-title">Ulasan pembeli</h2>
        {data && data.average !== null ? (
          <p className="reviews-rating">
            <Stars value={data.average} /> <strong>{data.average.toFixed(1)}</strong>
            <span className="muted small"> · {data.count} ulasan</span>
          </p>
        ) : (
          <p className="muted small">Belum ada ulasan.</p>
        )}
      </div>

      {user && own?.can_review && (
        <form
          className="review-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            submit.mutate();
          }}
        >
          <p className="label">Beri penilaianmu</p>
          <div className="rating-pick" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                className={`chip ${rating === n ? 'on' : ''}`}
                onClick={() => setRating(n)}
              >
                {n} ★
              </button>
            ))}
          </div>
          <label className="field">
            <span className="label">Ulasan (opsional)</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ceritakan kualitas barang dan pengirimannya"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" disabled={submit.isPending}>
            {submit.isPending ? 'Menyimpan…' : 'Kirim ulasan'}
          </button>
        </form>
      )}

      {user && own?.review && (
        <p className="callout-info">Ulasan kamu: {'★'.repeat(own.review.rating)} {own.review.comment && `· ${own.review.comment}`}</p>
      )}
      {!user && (
        <p className="muted small"><Link to="/login">Masuk</Link> lalu beli produk ini untuk memberi ulasan.</p>
      )}

      {data && data.items.length > 0 && (
        <ul className="review-list">
          {data.items.map((r) => (
            <li key={r.id} className="review-item">
              <div className="review-meta">
                <Stars value={r.rating} />
                <strong>{r.buyer_name}</strong>
                <span className="muted small">{formatDate(r.created_at)}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
