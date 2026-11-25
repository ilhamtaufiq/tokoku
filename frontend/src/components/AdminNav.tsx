import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { btn, cx } from '../pages/admin/adminUi';

const ITEMS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/admin', label: 'Ringkasan', icon: 'dashboard', end: true },
  { to: '/admin/orders', label: 'Pesanan', icon: 'receipt_long' },
  { to: '/admin/products', label: 'Produk', icon: 'inventory_2' },
  { to: '/admin/banners', label: 'Banner', icon: 'view_carousel' },
  { to: '/admin/users', label: 'Pengguna', icon: 'group' },
  { to: '/admin/promos', label: 'Promo', icon: 'sell' },
  { to: '/admin/reviews', label: 'Ulasan', icon: 'rate_review' },
  { to: '/admin/aktivitas', label: 'Aktivitas', icon: 'history' },
  { to: '/admin/store', label: 'Data toko', icon: 'store' },
];

/**
 * Shell panel admin. Di layar lebar, sidebar tampil tetap di kiri.
 * Di layar kecil, sidebar menjadi drawer yang dibuka dari bar atas.
 */
export function AdminLayout() {
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
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-soft bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          className={btn('default', 'sm')}
          aria-controls="admin-side"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="material-symbols-outlined" aria-hidden>menu</span>
          Menu
        </button>
        <span className="material-symbols-outlined ml-auto text-[22px] text-primary" aria-hidden>storefront</span>
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
          'fixed inset-y-0 left-0 z-50 flex w-[264px] max-w-[85vw] flex-col gap-5 overflow-y-auto border-r border-outline-soft bg-surface p-4 transition-[transform,visibility] duration-200 ease-out',
          open ? 'translate-x-0 visible' : '-translate-x-full invisible',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:visible lg:py-6 lg:transition-none',
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <span className="material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-primary text-[20px] text-on-primary" aria-hidden>
            storefront
          </span>
          <div className="min-w-0">
            <strong className="block font-display text-[17px] leading-[22px] text-ink">Tokoku</strong>
            <span className="block text-xs font-semibold text-muted">Portal penjual</span>
          </div>
        </div>

        <nav aria-label="Menu admin" className="flex flex-col gap-1">
          {ITEMS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx(
                  'flex h-[42px] items-center gap-3 rounded-field px-3 text-sm font-semibold no-underline transition-colors hover:bg-surface-low hover:text-ink hover:no-underline',
                  isActive ? 'bg-secondary-container/60 text-primary' : 'text-ink-2',
                )
              }
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>{it.icon}</span>
              {it.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-outline-soft pt-3">
          <NavLink to="/" onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary no-underline hover:underline">
            <span className="material-symbols-outlined text-[18px]" aria-hidden>arrow_back</span>
            Ke toko
          </NavLink>
          <NavLink to="/account" onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary no-underline hover:underline">
            <span className="material-symbols-outlined text-[18px]" aria-hidden>manage_accounts</span>
            {user?.name ?? 'Akun saya'}
          </NavLink>
          <button
            type="button"
            className={btn('ghost', 'sm', 'self-start')}
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
          <Outlet />
        </div>
      </div>
    </div>
  );
}
