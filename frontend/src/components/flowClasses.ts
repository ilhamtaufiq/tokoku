/*
 * Kelas Tailwind bersama untuk alur keranjang, checkout, dan akun.
 * Setiap string ditulis utuh (bukan hasil konkatenasi dinamis) agar terdeteksi oleh Tailwind.
 */

const base =
  'inline-flex items-center justify-center gap-2 rounded-field font-body font-semibold whitespace-nowrap no-underline cursor-pointer select-none transition-colors duration-150 active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none [&_.material-symbols-outlined]:text-[20px]';

const tones = {
  default: 'border border-outline bg-surface text-ink hover:border-primary',
  primary: 'border border-primary bg-primary text-on-primary hover:brightness-110',
  ghost: 'border border-transparent bg-transparent text-primary hover:bg-surface-low',
  text: 'border border-transparent bg-transparent text-primary hover:underline',
  danger: 'border border-transparent bg-transparent text-error hover:underline',
} as const;

const sizes = {
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
  xl: 'h-[52px] px-6 text-base',
  sm: 'h-9 px-3 text-[13px]',
  xs: 'px-1.5 py-1 text-[13px]',
} as const;

/** Tombol: btn('primary', 'lg', 'w-full'). */
export function btn(tone: keyof typeof tones = 'default', size: keyof typeof sizes = 'md', extra = '') {
  return [base, tones[tone], sizes[size], extra].filter(Boolean).join(' ');
}

/** Input, select, dan textarea. */
export const field =
  'block w-full min-h-11 rounded-field border border-outline bg-surface px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-muted outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary focus:ring-3 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-high disabled:text-muted';

/** Pembungkus label formulir. */
export const label = 'flex flex-col gap-1.5 text-[13px] font-semibold tracking-[0.2px] text-ink-2';

/** Kartu permukaan. Tambahkan padding sesuai kebutuhan. */
export const card = 'rounded-card border border-outline-soft bg-surface';

/** Judul halaman (h1). */
export const pageTitle =
  'mb-1 font-display text-[28px] leading-9 font-bold tracking-[-0.4px] text-ink md:text-[32px] md:leading-10';

/** Judul bagian di dalam kartu (h2). */
export const sectionTitle = 'mt-0 mb-1 font-display text-lg font-semibold leading-7 text-ink';

/** Teks pendukung di bawah judul halaman. */
export const pageSub = '-mt-2 mb-6 text-sm text-muted';

/** Kotak pesan error. */
export const alertError = 'rounded-field bg-error-soft px-3.5 py-2.5 text-sm text-on-error-soft';

/** Blok skeleton dengan efek kilau (keyframes shimmer dari styles.css). */
export const skeleton =
  "relative overflow-hidden rounded-field bg-surface-high after:absolute after:inset-0 after:content-[''] after:animate-[shimmer_1.3s_infinite] after:bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--surface)_65%,transparent),transparent)]";

/** Kapsul status kecil (tag). */
export const tag = 'inline-flex h-6 items-center gap-1 rounded-pill bg-surface-high px-2.5 text-xs font-semibold text-ink-2 whitespace-nowrap';
export const tagDanger = 'inline-flex h-6 items-center gap-1 rounded-pill bg-error-soft px-2.5 text-xs font-semibold text-on-error-soft whitespace-nowrap';
