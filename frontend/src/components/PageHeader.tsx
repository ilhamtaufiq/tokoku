import type { ReactNode } from 'react';

/** Header halaman admin yang seragam: judul, keterangan singkat, dan aksi di kanan. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="mb-1 text-2xl font-bold sm:text-[32px]">{title}</h1>
        {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
