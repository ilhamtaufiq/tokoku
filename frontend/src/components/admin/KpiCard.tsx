import { Card } from '@/components/ui/card';
import { cx } from '../../pages/admin/adminUi';

export type KpiDelta = { text: string; up: boolean; title?: string };

/* Pill delta mengikuti acuan: hitam untuk naik, merah muda untuk turun. */
const DELTA_CLASS = {
  up: 'bg-foreground text-background',
  down: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
} as const;

/**
 * Kartu KPI gaya template: tile ikon kecil di kiri atas, judul di bawahnya, angka besar
 * sans-serif, pill delta opsional, lalu keterangan pembanding. Angka tidak memakai font mono.
 */
export function KpiCard({
  title,
  icon,
  value,
  delta,
  note,
  noteClass,
  className,
}: {
  title: string;
  icon: string;
  value: string | number;
  delta?: KpiDelta;
  note: string;
  noteClass?: string;
  className?: string;
}) {
  return (
    <Card className={cx('gap-0 rounded-card border border-outline-soft bg-surface p-5 shadow-card ring-0', className)}>
      <span
        className="material-symbols-outlined flex size-8 items-center justify-center rounded-md border border-outline-soft bg-surface-high text-[18px] text-ink-2"
        aria-hidden
      >
        {icon}
      </span>
      <p className="mt-4 text-sm text-muted">{title}</p>
      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap text-foreground tabular-nums sm:text-[30px]">
          {value}
        </span>
        {delta && (
          <span
            title={delta.title}
            className={cx(
              'inline-flex h-6 shrink-0 items-center gap-1 rounded-pill px-2 text-xs font-semibold',
              delta.up ? DELTA_CLASS.up : DELTA_CLASS.down,
            )}
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden>
              {delta.up ? 'trending_up' : 'trending_down'}
            </span>
            {delta.text}
          </span>
        )}
      </div>
      <p className={cx('mt-2 text-sm text-muted', noteClass)}>{note}</p>
    </Card>
  );
}
