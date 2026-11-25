import { useState } from 'react';

/** Gambar produk. Jika belum ada gambar atau gagal dimuat, tampilkan placeholder berisi huruf pertama nama produk. Ukuran ditentukan induk lewat className. */
export function ProductImage({
  name,
  src,
  large = false,
  className = '',
}: {
  name: string;
  src: string | null;
  large?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const base = `thumb relative flex items-center justify-center overflow-hidden bg-surface-low font-display font-bold tracking-tight text-muted ${large ? 'large' : ''} ${className}`;
  if (src && failedSrc !== src) {
    return (
      <div className={`${base} has-image p-0`}>
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="thumb-img block h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      </div>
    );
  }
  return (
    <div className={base} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
