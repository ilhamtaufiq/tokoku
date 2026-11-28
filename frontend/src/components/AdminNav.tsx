import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { btn, cx } from '../pages/admin/adminUi';

type NavItem = { to: string; label: string; icon: string; end?: boolean };
type NavGroup = { title: string; items: NavItem[]; platformOnly?: boolean };

/** Menu dikelompokkan seperti sidebar Stitch: judul grup kecil di atas, ikon di tiap item. */
const GROUPS: NavGroup[] = [
  {
    title: 'Operasional bisnis',
    items: [
      { to: '/admin', label: 'Ringkasan', icon: 'dashboard', end: true },
      { to: '/admin/orders', label: 'Pesanan', icon: 'receipt_long' },
      { to: '/admin/products', label: 'Produk', icon: 'inventory_2' },
      { to: '/admin/promos', label: 'Promo', icon: 'sell' },
      { to: '/admin/reviews', label: 'Ulasan', icon: 'rate_review' },
    ],
  },
  {
    title: 'Platform',
    platformOnly: true,
    items: [
      { to: '/admin/banners', label: 'Banner', icon: 'view_carousel' },
      { to: '/admin/stores', label: 'Toko', icon: 'storefront' },
      { to: '/admin/users', label: 'Pengguna', icon: 'group' },
    ],
  },
  {
    title: 'Fiskal & rekening',
    items: [{ to: '/admin/store', label: 'Data toko', icon: 'account_balance' }],
  },
  {
    title: 'Dukungan teknis',
    items: [{ to: '/admin/aktivitas', label: 'Aktivitas', icon: 'history' }],
  },
];

const LINK_BASE = 'flex h-11 items-center gap-3 rounded-field px-3 text-sm font-semibold no-underline transition-colors hover:no-underline';
const LINK_IDLE = 'text-[#cbd5e1] hover:bg-white/10 hover:text-white';
const LINK_ACTIVE = 'bg-primary-container text-white';
const FOOT_LINK = 'flex h-11 items-center gap-2.5 rounded-field px-3 text-[13px] font-semibold text-[#cbd5e1] no-underline hover:bg-white/10 hover:text-white hover:no-underline';

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

  const groups = GROUPS.filter((g) => !g.platformOnly || user?.role === 'admin');

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
        <span className="material-symbols-outlined ml-auto flex h-9 w-9 items-center justify-center rounded-field bg-[#213145] text-[20px] text-white" aria-hidden>storefront</span>
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
          'fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[85vw] flex-col gap-6 overflow-y-auto bg-[#213145] p-4 text-white transition-[transform,visibility] duration-200 ease-out',
          open ? 'translate-x-0 visible' : '-translate-x-full invisible',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:max-w-none lg:translate-x-0 lg:visible lg:py-6 lg:transition-none',
        )}
      >
        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-primary-container text-[22px] text-white" aria-hidden>
            storefront
          </span>
          <div className="min-w-0">
            <strong className="block font-display text-[17px] leading-[22px] text-white">Tokoku</strong>
            <span className="block truncate text-xs font-semibold text-[#94a3b8]">Portal penjual</span>
          </div>
        </div>

        <nav aria-label="Menu admin" className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-1">
              <p className="m-0 px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">{g.title}</p>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => cx(LINK_BASE, isActive ? LINK_ACTIVE : LINK_IDLE)}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>{it.icon}</span>
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-3">
          <NavLink to="/" onClick={() => setOpen(false)} className={FOOT_LINK}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>arrow_back</span>
            Ke toko
          </NavLink>
          <NavLink to="/account" onClick={() => setOpen(false)} className={FOOT_LINK}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>manage_accounts</span>
            <span className="truncate">{user?.name ?? 'Akun saya'}</span>
          </NavLink>
          <button
            type="button"
            className="mt-1 flex h-11 items-center rounded-field px-3 text-left text-sm font-semibold text-[#cbd5e1] hover:bg-white/10 hover:text-white"
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
