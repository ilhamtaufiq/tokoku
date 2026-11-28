import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Banner } from '../api/types';
import { btnBase } from './ui/storefront';

const ctaClass = `${btnBase} mt-2 h-11 self-start bg-white px-5 text-primary-container hover:bg-white/90 focus-visible:outline-white max-[760px]:text-[13px]`;

/** Carousel banner promo: rotasi otomatis, bisa digeser manual, dan berhenti saat disentuh/hover. */
export function BannerCarousel({ banners, compact = false }: { banners: Banner[]; compact?: boolean }) {
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
      className={`relative isolate overflow-hidden rounded-banner bg-primary-container text-white max-[760px]:h-[230px] max-[760px]:rounded-card ${
        compact ? 'h-[240px]' : 'mb-6 h-[300px]'
      }`}
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
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
          style={b.image_url ? { backgroundImage: `url(${b.image_url})` } : undefined}
          aria-hidden={i !== index}
        >
          {b.image_url && <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/50 to-primary/5" />}
          <div className="relative flex h-full max-w-[640px] flex-col justify-center gap-2.5 px-14 max-[760px]:px-[22px]">
            <h2 className="m-0 font-display text-[30px] font-bold leading-[38px] tracking-tight text-white max-[760px]:text-[21px] max-[760px]:leading-7">
              {b.title}
            </h2>
            {b.subtitle && <p className="m-0 text-base text-white/90 max-[760px]:text-[13px]">{b.subtitle}</p>}
            {b.cta_label && b.cta_url && (
              b.cta_url.startsWith('/')
                ? <Link to={b.cta_url} className={ctaClass} tabIndex={i === index ? 0 : -1}>{b.cta_label}</Link>
                : <a href={b.cta_url} className={ctaClass} rel="noopener noreferrer" tabIndex={i === index ? 0 : -1}>{b.cta_label}</a>
            )}
          </div>
        </div>
      ))}

      {count > 1 && (
        <>
          <div
            className="absolute bottom-[18px] left-14 z-[2] flex gap-2 max-[760px]:left-[22px]"
            role="tablist"
            aria-label="Pilih banner"
          >
            {banners.map((b, i) => (
              <button
                key={b.id}
                role="tab"
                aria-selected={i === index}
                aria-label={`Banner ${i + 1}: ${b.title}`}
                className={`relative h-[9px] cursor-pointer rounded-pill border-0 p-0 transition-all duration-200 before:absolute before:-inset-[18px] before:content-[''] ${
                  i === index ? 'w-[26px] bg-white' : 'w-[9px] bg-white/45 hover:bg-white/70'
                }`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            className="absolute left-3.5 top-1/2 z-[2] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill border-0 bg-white/20 text-white hover:bg-white/35 max-[760px]:hidden"
            aria-label="Banner sebelumnya"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
          >
            <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
          </button>
          <button
            className="absolute right-3.5 top-1/2 z-[2] flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill border-0 bg-white/20 text-white hover:bg-white/35 max-[760px]:hidden"
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
