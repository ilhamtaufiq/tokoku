import { useState } from 'react';

/** Placeholder foto dari desain Stitch (public/demo). Dipakai hanya jika produk belum punya gambar. */
const PLACEHOLDERS = [
  '/demo/flash-1.jpg', '/demo/flash-2.jpg', '/demo/flash-3.jpg', '/demo/flash-4.jpg',
  '/demo/grid-1.jpg', '/demo/grid-2.jpg', '/demo/grid-3.jpg', '/demo/grid-4.jpg', '/demo/grid-5.jpg', '/demo/grid-6.jpg',
];

function placeholderFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PLACEHOLDERS[h % PLACEHOLDERS.length];
}

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
  const resolved = src ?? placeholderFor(name);
  const base = `thumb relative flex items-center justify-center overflow-hidden bg-surface-low font-display font-bold tracking-tight text-muted ${large ? 'large' : ''} ${className}`;
  if (failedSrc !== resolved) {
    return (
      <div className={`${base} has-image p-0`}>
        <img
          src={resolved}
          alt={src ? name : ''}
          loading="lazy"
          className="thumb-img block h-full w-full object-cover"
          onError={() => setFailedSrc(resolved)}
        />
      </div>
    );
  }
  return (
    <div className={base} aria-hidden>
      <span className="material-symbols-outlined text-[40px] text-outline">inventory_2</span>
    </div>
  );
}
