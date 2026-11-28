import { Fragment, type ReactNode } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

/**
 * Header halaman admin yang seragam, mengikuti template shadcn: breadcrumb kecil di atas,
 * judul tebal, keterangan singkat, dan aksi di kanan.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: string[];
}) {
  return (
    <header className="mb-6 flex flex-col gap-2">
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb aria-label="Lokasi halaman">
          <BreadcrumbList className="m-0 list-none gap-1 p-0 text-xs font-semibold text-muted sm:gap-1">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <Fragment key={`${i}-${c}`}>
                  {i > 0 && (
                    <BreadcrumbSeparator />
                  )}
                  <BreadcrumbItem>
                    {last ? <BreadcrumbPage className="font-semibold text-primary">{c}</BreadcrumbPage> : <span>{c}</span>}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="mb-1 font-display text-2xl font-bold leading-tight tracking-tight text-ink sm:text-[32px] sm:leading-[40px]">{title}</h1>
          {subtitle && <p className="m-0 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
