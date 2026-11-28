import type { ReactNode } from 'react';

/** Gabungkan kelas Tailwind, abaikan nilai kosong. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------- Tombol ---------- */

export type BtnVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'outlineDanger' | 'link' | 'linkDanger';
export type BtnSize = 'md' | 'sm' | 'link';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field border text-sm font-semibold tracking-[0.1px] no-underline transition-colors cursor-pointer hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none [&_.material-symbols-outlined]:text-[20px]';

const BTN_VARIANT: Record<BtnVariant, string> = {
  default: 'border-outline bg-surface text-ink hover:border-primary',
  primary: 'border-primary bg-primary text-on-primary hover:brightness-110',
  ghost: 'border-transparent bg-transparent text-primary hover:bg-surface-low',
  danger: 'border-error bg-error text-white hover:brightness-110',
  outlineDanger: 'border-error bg-surface text-error hover:bg-error-soft',
  link: 'border-transparent bg-transparent text-primary hover:underline',
  linkDanger: 'border-transparent bg-transparent text-error hover:underline',
};

const BTN_SIZE: Record<BtnSize, string> = {
  md: 'h-10 px-4 max-md:h-11',
  sm: 'h-[34px] px-3 text-[13px] max-md:h-11',
  link: 'h-auto px-1.5 py-1 max-md:min-h-11 max-md:px-3',
};

export function btn(variant: BtnVariant = 'default', size: BtnSize = 'md', extra?: string): string {
  return cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], extra);
}

/* ---------- Kartu, badge, notifikasi ---------- */

export const CARD = 'rounded-card border border-outline-soft bg-surface';

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-high text-ink-2',
  ok: 'bg-success-soft text-on-success-soft',
  warn: 'bg-warning-soft text-on-warning-soft',
  danger: 'bg-error-soft text-on-error-soft',
  info: 'bg-secondary-container text-on-secondary-container',
};

export function StatusBadge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex h-6 items-center whitespace-nowrap rounded-pill px-2.5 text-xs font-semibold', TONE[tone], className)}>
      {children}
    </span>
  );
}

export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return (
    <p className={cx('rounded-field px-3.5 py-2.5 text-sm', kind === 'ok' ? 'bg-success-soft text-on-success-soft' : 'bg-error-soft text-on-error-soft')}>
      {children}
    </p>
  );
}

/* ---------- Chip filter ---------- */

export function chipClass(on: boolean): string {
  return cx(
    'inline-flex h-11 items-center whitespace-nowrap rounded-pill border px-3.5 text-[13px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:h-8 md:px-3',
    on ? 'border-primary bg-secondary-container text-on-secondary-container' : 'border-outline bg-surface text-ink-2 hover:border-primary hover:text-primary',
  );
}

/* ---------- Filter bar ---------- */

export const FILTER_BAR = cx(CARD, 'mb-4 flex flex-col gap-3 p-3.5 md:flex-row md:flex-wrap md:items-center');
/** Angka uang, stok, dan kode: lebar tetap agar kolom sejajar. */
export const MONEY = 'font-mono tabular-nums tracking-[-0.01em]';
export const CHIP_GROUP = 'flex flex-wrap gap-1.5';
export const SEARCH_WRAP = 'relative w-full md:min-w-[240px] md:flex-1';
export const SEARCH_ICON = 'material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted';

/* ---------- Form ---------- */

export const FORM_CARD = cx(CARD, 'flex flex-col gap-4 p-4 sm:p-6');
export const LABEL = 'flex flex-col gap-1.5 text-[13px] font-semibold text-ink-2';
/* `label` di styles.css tanpa layer memakai flex-col, jadi harus ditimpa dengan !. */
export const LABEL_CHECK = '!flex !flex-row items-center gap-2 text-sm font-medium text-ink';
export const INPUT = 'min-h-11 md:min-h-10 w-full min-w-0 rounded-field border border-outline bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-high disabled:text-muted';
/* `input { width:100% }` di styles.css tanpa layer menimpa w-4, jadi lebar dan tinggi memakai !. */
export const CHECKBOX = '!h-4 !w-4 !min-h-0 !flex-none accent-primary cursor-pointer disabled:cursor-not-allowed';
export const ROW = 'flex flex-col gap-4 sm:flex-row sm:flex-wrap [&>*]:min-w-0 sm:[&>*]:flex-1 sm:[&>*]:basis-40';
export const ACTIONS = 'flex flex-wrap items-center gap-2';
export const HINT = 'text-xs text-muted';

/* ---------- Tabel ---------- */

export const TABLE_WRAP = cx(CARD, 'overflow-x-auto');
export const TABLE = 'w-full border-collapse text-sm';
/**
 * Tabel yang berubah jadi daftar kartu di bawah md. Setiap sel memberi judul
 * lewat atribut data-label. Di md ke atas tampilannya tetap tabel biasa.
 */
export const TABLE_STACK = cx(
  TABLE,
  'max-md:block',
  'max-md:[&_thead]:hidden',
  'max-md:[&_tbody]:block',
  'max-md:[&_tr]:block max-md:[&_tr]:border-b max-md:[&_tr]:border-outline-soft max-md:[&_tr]:px-3 max-md:[&_tr]:py-2.5',
  'max-md:[&_td]:flex max-md:[&_td]:items-center max-md:[&_td]:justify-between max-md:[&_td]:gap-3 max-md:[&_td]:border-0 max-md:[&_td]:px-0 max-md:[&_td]:py-1.5 max-md:[&_td]:text-right',
  'max-md:[&_td:first-child]:text-left',
  'max-md:[&_td.hidden]:hidden',
  'max-md:[&_td::before]:text-left max-md:[&_td::before]:text-xs max-md:[&_td::before]:font-semibold max-md:[&_td::before]:text-muted',
  'max-md:[&_td::before]:content-[attr(data-label)]',
  "max-md:[&_td[data-label='']::before]:content-none",
);
export const TBODY = '[&>tr:last-child>td]:border-b-0';
export const TH = 'whitespace-nowrap border-b border-outline-soft bg-surface-low px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.6px] text-muted sm:px-4';
export const TD = 'border-b border-outline-soft px-3 py-3 align-middle text-ink sm:px-4';
export const TH_NUM = cx(TH, 'text-right');
export const TD_NUM = cx(TD, 'whitespace-nowrap text-right tabular-nums');
/** Sel angka uang di tabel: rata kanan dengan font mono. */
export const TD_MONEY = cx(TD, 'whitespace-nowrap text-right', MONEY);
/** Kolom sekunder: disembunyikan di layar kecil agar kolom penting tetap terbaca. */
export const HIDE_SM = 'hidden sm:table-cell';
export const HIDE_MD = 'hidden md:table-cell';
export const HIDE_LG = 'hidden lg:table-cell';

export const SKU = 'font-mono text-xs text-muted';
export const MUTED_SMALL = 'text-xs text-muted';
export const EMPTY_ROW = 'px-4 py-10 text-center text-sm text-muted';

/* ---------- Tren, sparkline, dan penanda DEMO (Stitch) ---------- */

/** Penanda untuk data dummy. Dipakai bersama komentar {/* DEMO *\/} di JSX. */
export const DEMO_TAG = 'inline-flex h-5 items-center rounded-pill border border-dashed border-outline px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted';

/** Baris tren kecil di bawah angka KPI: panah, selisih, dan keterangan. `good` menentukan warna. */
export function Trend({ delta, note, up, good }: { delta: string; note: string; up: boolean; good: boolean }) {
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-1 text-xs font-semibold', good ? 'text-success' : 'text-error')}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden>{up ? 'trending_up' : 'trending_down'}</span>
      {delta}
      <span className="font-normal text-muted">{note}</span>
    </span>
  );
}

/** Garis tren kecil tanpa sumbu. Hanya untuk visual, tidak dibaca oleh layar pembaca. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${92 - ((v - min) / range) * 84}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cx('h-10 w-full', className)} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
