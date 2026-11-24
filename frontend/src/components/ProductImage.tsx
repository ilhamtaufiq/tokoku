/** Gambar produk. Jika belum ada gambar, tampilkan placeholder berisi huruf pertama nama produk. */
export function ProductImage({ name, src, large = false }: { name: string; src: string | null; large?: boolean }) {
  const cls = `thumb ${large ? 'large' : ''}`;
  if (src) {
    return (
      <div className={`${cls} has-image`}>
        <img src={src} alt={name} loading="lazy" className="thumb-img" />
      </div>
    );
  }
  return (
    <div className={cls} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
