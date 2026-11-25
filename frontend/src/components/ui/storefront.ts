/**
 * Kelas Tailwind bersama untuk tampilan storefront (dipakai agen storefront).
 * Warna memakai token (bg-primary, text-ink, border-outline-soft, ...) sehingga mode gelap ikut berubah.
 */

/** Ukuran, tipografi, dan state dasar tombol. Tanpa warna border/latar agar bisa dikombinasikan. */
export const btnBase =
  'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-field px-4 text-sm font-semibold no-underline cursor-pointer transition-[background-color,border-color,color,filter,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:opacity-85 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_.material-symbols-outlined]:text-xl';

export const btnDefault = 'border border-outline bg-surface text-ink hover:border-primary hover:text-primary';
export const btnPrimary = 'border border-primary bg-primary text-on-primary hover:brightness-110';
export const btnOutline = 'border-[1.5px] border-primary bg-surface text-primary hover:bg-secondary-container';

/** Kartu permukaan standar. */
export const card = 'rounded-card border border-outline-soft bg-surface';

/** Keadaan kosong (empty state) di dalam kartu. */
export const emptyNote =
  'flex flex-col items-center gap-2.5 rounded-card border border-outline-soft bg-surface px-5 py-10 text-center text-muted [&_.material-symbols-outlined]:text-[40px] [&_.material-symbols-outlined]:text-outline [&_p]:m-0';

/** Pesan error inline. */
export const errorBox = 'm-0 rounded-field bg-error-soft px-3 py-2 text-sm text-on-error-soft';

/** Label kecil uppercase di atas field. */
export const label = 'text-xs font-bold uppercase tracking-wider text-muted';

/** Field teks (input/textarea). */
export const fieldInput =
  'w-full rounded-field border border-outline bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

/** Tag status kecil (Habis, Sisa n, ...). */
export const tagBase = 'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold';
export const tagDanger = 'bg-error-soft text-on-error-soft';
export const tagWarn = 'bg-warning-soft text-on-warning-soft';

/** Label PPN (Termasuk PPN). */
export const ppnChip =
  'inline-flex h-6 w-fit items-center whitespace-nowrap rounded-pill bg-accent-soft px-2.5 text-xs font-semibold text-on-accent-soft';

/** Chip pilihan (sort, rating). */
export const chipBase =
  'inline-flex h-8 flex-none items-center rounded-pill border px-3 text-[13px] font-semibold cursor-pointer transition-colors duration-150';
export const chipIdle = 'border-outline bg-surface text-ink-2 hover:border-primary hover:text-primary';
export const chipOn = 'border-primary bg-secondary-container text-on-secondary-container';

/** Skeleton memuat. */
export const skeletonBlock = 'animate-pulse bg-surface-high';

/** Kelas judul section. */
export const headingFont = 'font-display font-semibold tracking-tight text-ink';
