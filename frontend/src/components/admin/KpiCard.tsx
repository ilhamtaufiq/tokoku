import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cx } from '../../pages/admin/adminUi';

/** Kartu KPI: judul dan ikon di atas, angka besar, keterangan, lalu slot untuk tren atau grafik. */
export function KpiCard({
  title,
  icon,
  iconClassName,
  children,
  footer,
  className,
}: {
  title: string;
  icon: string;
  iconClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx('gap-1.5 rounded-card border border-outline-soft bg-surface p-4 shadow-card ring-0 lg:p-5', className)}>
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-ink-2">
        <span>{title}</span>
        <span
          className={cx(
            'material-symbols-outlined flex h-9 w-9 flex-none items-center justify-center rounded-field bg-secondary-container text-[20px] text-on-secondary-container',
            iconClassName,
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      {children}
      {footer && <div className="mt-1 flex flex-wrap items-center gap-2">{footer}</div>}
    </Card>
  );
}
