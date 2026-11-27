import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { btn, cx } from '../pages/admin/adminUi';

/** Item menu; `divider` menaruh garis pemisah sebelum item (pengelompokan visual). */
const ITEMS: { to: string; label: string; icon: string; end?: boolean; platformOnly?: boolean; divider?: boolean }[] = [
  { to: '/admin', label: 'Ringkasan', icon: 'dashboard', end: true },
  { to: '/admin/orders', label: 'Pesanan', icon: 'receipt_long' },
  { to: '/admin/products', label: 'Produk', icon: 'inventory_2' },
  { to: '/admin/banners', label: 'Banner', icon: 'view_carousel', platformOnly: true, divider: true },
  { to: '/admin/stores', label: 'Toko', icon: 'storefront', platformOnly: true },
  { to: '/admin/users', label: 'Pengguna', icon: 'group', platformOnly: true },
  { to: '/admin/promos', label: 'Promo', icon: 'sell' },
  { to: '/admin/reviews', label: 'Ulasan', icon: 'rate_review' },
  { to: '/admin/aktivitas', label: 'Aktivitas', icon: 'history' },
  { to: '/admin/store', label: 'Data toko', icon: 'store', divider: true },
];

/**
 * Shell panel admin. Di layar lebar, sidebar tampil tetap di kiri.
 * Di layar kecil, sidebar menjadi drawer yang dibuka dari bar atas.
 */
export function AdminLayout() {
  const location = useLocation();
  useSeo({ title: 'Admin', noindex: true });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Tutup drawer dengan tombol Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-soft bg-surface px-4 py-2.5 lg:hidden">
        <button
          type="button"
          className={btn('default', 'sm', '!h-11 !px-4')}
          aria-controls="admin-side"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="material-symbols-outlined" aria-hidden>menu</span>
          Menu
        </button>
        <span className="material-symbols-outlined ml-auto flex h-9 w-9 items-center justify-center rounded-field bg-primary text-[20px] text-on-primary" aria-hidden>storefront</span>
      </header>

      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-40 cursor-default bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="admin-side"
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[85vw] flex-col gap-5 overflow-y-auto border-r border-outline-soft bg-surface p-4 transition-[transform,visibility] duration-200 ease-out',
          open ? 'translate-x-0 visible' : '-translate-x-full invisible',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:visible lg:py-6 lg:transition-none',
        )}
      >
        <div className="flex items-center gap-3 rounded-card bg-surface-low p-3">
          <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-primary text-[22px] text-on-primary" aria-hidden>
            storefront
          </span>
          <div className="min-w-0">
            <strong className="block font-display text-[17px] leading-[22px] text-ink">Tokoku</strong>
            <span className="block truncate text-xs font-semibold text-muted">Portal penjual</span>
          </div>
        </div>

        <nav aria-label="Menu admin" className="flex flex-col gap-1">
          {ITEMS.filter((it) => !it.platformOnly || user?.role === 'admin').map((it) => (
            <div key={it.to} className="contents">
              {it.divider && <div className="my-2 h-px bg-outline-soft" role="presentation" />}
              <NavLink
                to={it.to}
                end={it.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'flex h-11 items-center gap-3 rounded-field px-3 text-sm font-semibold no-underline transition-colors hover:no-underline',
                    isActive
                      ? 'bg-primary text-on-primary shadow-cta'
                      : 'text-ink-2 hover:bg-surface-low hover:text-ink',
                  )
                }
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>{it.icon}</span>
                {it.label}
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-outline-soft pt-3">
          <NavLink to="/" onClick={() => setOpen(false)} className="flex h-11 items-center gap-2.5 rounded-field px-3 text-[13px] font-semibold text-primary no-underline hover:bg-surface-low hover:no-underline">
            <span className="material-symbols-outlined text-[18px]" aria-hidden>arrow_back</span>
            Ke toko
          </NavLink>
          <NavLink to="/account" onClick={() => setOpen(false)} className="flex h-11 items-center gap-2.5 rounded-field px-3 text-[13px] font-semibold text-primary no-underline hover:bg-surface-low hover:no-underline">
            <span className="material-symbols-outlined text-[18px]" aria-hidden>manage_accounts</span>
            <span className="truncate">{user?.name ?? 'Akun saya'}</span>
          </NavLink>
          <button
            type="button"
            className={btn('ghost', 'md', 'mt-1 justify-start px-3 text-ink-2')}
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/');
            }}
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="min-w-0 px-4 pb-14 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-[1180px]">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
