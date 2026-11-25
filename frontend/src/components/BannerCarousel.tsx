import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Banner } from '../api/types';

/** Carousel banner promo: rotasi otomatis, bisa digeser manual, dan berhenti saat disentuh/hover. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => window.clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const current = banners[Math.min(index, count - 1)];

  return (
    <div
      className="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Banner promo"
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`slide ${i === index ? 'on' : ''}`}
          style={b.image_url ? { backgroundImage: `url(${b.image_url})` } : undefined}
          aria-hidden={i !== index}
        >
          <div className="slide-copy">
            <h2>{b.title}</h2>
            {b.subtitle && <p>{b.subtitle}</p>}
            {b.cta_label && b.cta_url && (
              b.cta_url.startsWith('/')
                ? <Link to={b.cta_url} className="btn primary" tabIndex={i === index ? 0 : -1}>{b.cta_label}</Link>
                : <a href={b.cta_url} className="btn primary" rel="noopener noreferrer" tabIndex={i === index ? 0 : -1}>{b.cta_label}</a>
            )}
          </div>
        </div>
      ))}

      {count > 1 && (
        <>
          <div className="carousel-dots" role="tablist" aria-label="Pilih banner">
            {banners.map((b, i) => (
              <button
                key={b.id}
                role="tab"
                aria-selected={i === index}
                aria-label={`Banner ${i + 1}: ${b.title}`}
                className={`dot ${i === index ? 'on' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            className="carousel-nav prev"
            aria-label="Banner sebelumnya"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
          >
            <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
          </button>
          <button
            className="carousel-nav next"
            aria-label="Banner berikutnya"
            onClick={() => setIndex((i) => (i + 1) % count)}
          >
            <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
          </button>
        </>
      )}
      <span className="sr-only">Banner {Math.min(index, count - 1) + 1} dari {count}: {current.title}</span>
    </div>
  );
}
