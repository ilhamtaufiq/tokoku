import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';

/** Potongan UI bersama untuk halaman admin (toko, pengguna, aktivitas) dan pendaftaran penjual. */

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-high text-ink-2',
  ok: 'bg-success-soft text-on-success-soft',
  warn: 'bg-warning-soft text-on-warning-soft',
  danger: 'bg-error-soft text-on-error-soft',
  info: 'bg-secondary-container text-on-secondary-container',
};

/** Kartu dengan gaya Tokoku (radius dan border), tanpa ring bawaan shadcn. */
export const PANEL = 'ring-0 border border-outline-soft bg-surface rounded-card shadow-card';

/** Label field form: teks di atas input, lebar penuh. */
export const FIELD_LABEL = 'flex flex-col items-stretch gap-1.5 text-[13px] font-semibold leading-normal text-ink-2';
/** Keterangan kecil di dalam label, misalnya "(15 atau 16 digit)". */
export const FIELD_HINT = 'text-xs font-normal text-sub';

/** Input dan textarea: tinggi 44px di mobile agar nyaman disentuh. */
export const FIELD_INPUT = 'h-11 md:h-9 w-full text-sm';

export function StatusPill({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className={cn('h-6 shrink-0 whitespace-nowrap rounded-pill border-transparent px-2.5 text-xs font-semibold', TONE[tone], className)}
    >
      {children}
    </Badge>
  );
}

/** Chip filter (toggle). `on` menandai pilihan aktif lewat aria-pressed. */
export function FilterChip({ on, className, ...props }: ComponentProps<typeof Button> & { on: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={on}
      className={cn(
        'h-11 rounded-pill px-3.5 text-[13px] font-semibold md:h-8 md:px-3',
        on
          ? 'border-primary bg-secondary-container text-on-secondary-container hover:bg-secondary-container'
          : 'border-outline bg-surface text-ink-2 hover:border-primary hover:bg-surface hover:text-primary',
        className,
      )}
      {...props}
    />
  );
}

export function Notice({ kind, className, children }: { kind: 'ok' | 'error'; className?: string; children: ReactNode }) {
  return (
    <Alert
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'py-2.5',
        kind === 'ok' ? 'border-success-soft bg-success-soft text-on-success-soft' : 'border-error-soft bg-error-soft text-on-error-soft',
        className,
      )}
    >
      <p className="m-0 text-sm">{children}</p>
    </Alert>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-sub">{children}</p>;
}
