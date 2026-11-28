import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/* Helper tampilan bersama untuk halaman admin produk dan konten. Hanya lapisan tampilan. */

/** Kartu panel: dipakai sebagai pembungkus tabel, toolbar, dan form. */
export const PANEL = 'gap-0 p-0 ring-outline-soft bg-surface shadow-card';

/** Angka uang, stok, dan kode: lebar tetap agar kolom sejajar. */
export const MONEY = 'font-mono tabular-nums tracking-[-0.01em]';
export const SKU = 'font-mono text-xs text-sub';
export const MUTED_SMALL = 'text-xs text-sub';
export const HINT = 'text-xs text-sub';
export const EMPTY_TEXT = 'px-4 py-10 text-center text-sm text-sub';
export const FORM_TITLE = 'm-0 text-lg font-semibold text-ink';
export const SECTION_RULE = 'mt-2 flex flex-col gap-3 border-t border-outline-soft pt-5';
export const FORM_BODY = 'flex flex-col gap-4 p-4 sm:p-6';

/* Tombol: tinggi 44px di mobile agar nyaman disentuh, lebih ringkas di desktop. */
export const BTN = 'h-11 md:h-10 px-4 font-semibold';
export const BTN_SM = 'h-11 md:h-8 px-3';
export const BTN_ICON = 'size-11 md:size-9';
export const LINK_BTN = 'h-auto px-1.5 py-1 font-semibold max-md:min-h-11 max-md:px-3';

/** Chip filter (dipakai sebagai tombol shadcn dengan status aktif). */
export function chipClass(on: boolean): string {
  return cn(
    'h-11 md:h-8 rounded-full px-3.5 md:px-3 text-[13px] font-semibold whitespace-nowrap',
    on
      ? 'border-primary bg-secondary-container text-on-secondary-container hover:bg-secondary-container'
      : 'text-ink-2 hover:text-primary',
  );
}

/** Baris dua kolom: menumpuk di mobile, sejajar di sm ke atas. */
export const ROW = 'flex flex-col gap-4 sm:flex-row sm:flex-wrap [&>*]:min-w-0 sm:[&>*]:flex-1 sm:[&>*]:basis-40';

/* Kontrol form: Input shadcn dan select native memakai gaya yang sama. */
export const FIELD = 'h-11 md:h-10 w-full min-w-0 rounded-lg border-input bg-surface px-3 text-sm text-ink dark:bg-surface';
export const FILE_FIELD =
  'h-auto min-h-11 md:min-h-10 py-2 text-sm text-ink file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary-container file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-on-secondary-container';

/* Tabel: shadcn Table, di layar kecil berubah jadi daftar kartu (data-label sebagai judul). */
export const TABLE_STACK = [
  'max-md:block',
  'max-md:[&_thead]:hidden',
  'max-md:[&_tbody]:block',
  'max-md:[&_tr]:block max-md:[&_tr]:border-b max-md:[&_tr]:border-outline-soft max-md:[&_tr]:px-3 max-md:[&_tr]:py-2.5',
  'max-md:[&_td]:flex max-md:[&_td]:items-center max-md:[&_td]:justify-between max-md:[&_td]:gap-3 max-md:[&_td]:border-0 max-md:[&_td]:px-0 max-md:[&_td]:py-1.5 max-md:[&_td]:text-right',
  'max-md:[&_td:first-child]:text-left',
  'max-md:[&_td.hidden]:hidden',
  'max-md:[&_td::before]:text-left max-md:[&_td::before]:text-xs max-md:[&_td::before]:font-semibold max-md:[&_td::before]:text-sub',
  'max-md:[&_td::before]:content-[attr(data-label)]',
  "max-md:[&_td[data-label='']::before]:content-none",
].join(' ');
export const TH = 'h-auto whitespace-nowrap bg-surface-low px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.6px] text-sub sm:px-4';
export const TD = 'whitespace-normal px-3 py-3 align-middle text-ink sm:px-4';
export const TH_NUM = cn(TH, 'text-right');
export const TD_NUM = cn(TD, 'whitespace-nowrap text-right tabular-nums');
export const TD_MONEY = cn(TD, 'whitespace-nowrap text-right', MONEY);
export const HIDE_SM = 'hidden sm:table-cell';
export const HIDE_MD = 'hidden md:table-cell';
export const HIDE_LG = 'hidden lg:table-cell';

/** Penanda data dummy (DEMO). */
export function DemoTag({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('h-5 border-dashed px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-sub', className)}
    >
      Demo
    </Badge>
  );
}

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-high text-ink-2',
  ok: 'bg-success-soft text-on-success-soft',
  warn: 'bg-warning-soft text-on-warning-soft',
  danger: 'bg-error-soft text-on-error-soft',
  info: 'bg-secondary-container text-on-secondary-container',
};

/** Label status berbentuk pil, memakai shadcn Badge. */
export function StatusPill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn('h-6 rounded-full border-transparent px-2.5 text-xs font-semibold whitespace-nowrap', TONE[tone])}>
      {children}
    </Badge>
  );
}

/** Notifikasi sukses atau galat di atas form dan tabel. */
export function FormNotice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  const ok = kind === 'ok';
  return (
    <Alert className={cn('rounded-lg border-transparent px-3.5 py-2.5', ok ? 'bg-success-soft text-on-success-soft' : 'bg-error-soft text-on-error-soft')}>
      <AlertDescription className={ok ? 'text-on-success-soft' : 'text-on-error-soft'}>{children}</AlertDescription>
    </Alert>
  );
}

/** Label yang membungkus kontrol, seperti sebelumnya. */
export function FormField({ label, className, children }: { label: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Label className={cn('flex flex-col items-stretch gap-1.5 text-[13px] font-semibold leading-snug text-ink-2', className)}>
      {label}
      {children}
    </Label>
  );
}

/** Kotak centang dengan label, memakai shadcn Checkbox. Area sentuh minimal 44px di mobile. */
export function CheckField({
  checked,
  onCheckedChange,
  className,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Label className={cn('flex min-h-11 flex-row items-center gap-2 text-sm font-medium text-ink md:min-h-0', className)}>
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v)} className="size-5 md:size-4" />
      {children}
    </Label>
  );
}
