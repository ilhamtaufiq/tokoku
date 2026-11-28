import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cx } from '../pages/admin/adminUi';

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
 * Shell admin berbasis Sidebar shadcn. Di layar lebar (md ke atas) sidebar tampil tetap di kiri.
 * Di layar kecil, sidebar menjadi drawer (Sheet) yang dibuka dari bar atas dan ditutup
 * dengan tombol "Tutup menu", klik di luar, atau tombol Escape.
 */
export function AdminLayout() {
  const location = useLocation();
  useSeo({ title: 'Admin', noindex: true });
  const { user } = useAuth();
  const groups = GROUPS.filter((g) => !g.platformOnly || user?.role === 'admin');

  return (
    <SidebarProvider className="min-h-screen bg-bg">
      <AdminSidebar groups={groups} />
      <SidebarInset className="min-w-0 bg-bg">
        <AdminTopBar />
        <div className="min-w-0 flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-[1180px]">
            <div key={location.pathname} className="animate-fade-up">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminTopBar() {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? openMobile : open;
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-soft bg-surface px-4 py-2.5">
      <Button
        variant="outline"
        className="h-11 gap-2 rounded-field px-4 text-sm font-semibold text-ink"
        aria-expanded={expanded}
        onClick={toggleSidebar}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>menu</span>
        <span className="md:sr-only">Menu</span>
      </Button>
      <span className="material-symbols-outlined ml-auto flex h-9 w-9 items-center justify-center rounded-field bg-[#213145] text-[20px] text-white" aria-hidden>
        storefront
      </span>
    </header>
  );
}

function AdminSidebar({ groups }: { groups: NavGroup[] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  /** Di layar kecil, klik menu atau tombol di sidebar menutup drawer. Di layar lebar sidebar tetap tampil. */
  const closeDrawer = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-outline-soft">
      {/* Latar gelap Tokoku dipasang di pembungkus isi, agar berlaku untuk sidebar tetap maupun drawer. */}
      <div className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-[#213145] p-4 text-white">
        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-primary-container text-[22px] text-white" aria-hidden>
            storefront
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-left font-display text-[17px] leading-[22px] text-white">Tokoku</strong>
            <span className="block truncate text-left text-xs font-semibold text-[#94a3b8]">Portal penjual</span>
          </div>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={closeDrawer}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field text-white hover:bg-white/10 md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>close</span>
          </button>
        </div>

        <nav aria-label="Menu admin" className="flex flex-col gap-5">
          {groups.map((g) => (
            <SidebarGroup key={g.title} className="gap-1 p-0">
              <SidebarGroupLabel className="h-auto px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                {g.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="m-0 list-none gap-1 p-0">
                  {g.items.map((it) => (
                    <SidebarMenuItem key={it.to}>
                      <NavLink
                        to={it.to}
                        end={it.end}
                        onClick={closeDrawer}
                        className={({ isActive }) => cx(LINK_BASE, isActive ? LINK_ACTIVE : LINK_IDLE)}
                      >
                        <span className="material-symbols-outlined text-[20px]" aria-hidden>{it.icon}</span>
                        {it.label}
                      </NavLink>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <Separator className="mb-2 bg-white/10" />
          <NavLink to="/" onClick={closeDrawer} className={FOOT_LINK}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>arrow_back</span>
            Ke toko
          </NavLink>
          <NavLink to="/account" onClick={closeDrawer} className={FOOT_LINK}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>manage_accounts</span>
            <span className="truncate">{user?.name ?? 'Akun saya'}</span>
          </NavLink>
          <button
            type="button"
            className="mt-1 flex h-11 items-center rounded-field border-0 bg-transparent px-3 text-left text-sm font-semibold text-[#cbd5e1] hover:bg-white/10 hover:text-white"
            onClick={async () => {
              closeDrawer();
              await logout();
              navigate('/');
            }}
          >
            Keluar
          </button>
        </div>
      </div>
    </Sidebar>
  );
}
