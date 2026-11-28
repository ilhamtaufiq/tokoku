import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
type Theme = 'light' | 'dark';

/** Menu dikelompokkan seperti sidebar template: judul grup kecil di atas, ikon di tiap item. */
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
const LINK_IDLE = 'text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-hover-fg';
const LINK_ACTIVE = 'bg-sidebar-primary text-sidebar-primary-foreground';
const FOOT_LINK = 'flex h-11 items-center gap-2.5 rounded-field px-3 text-[13px] font-semibold text-sidebar-foreground/70 no-underline hover:bg-sidebar-hover hover:text-sidebar-hover-fg hover:no-underline';

const REPO_URL = 'https://github.com/ilhamtaufiq/tokoku';
const THEME_KEY = 'tokoku-admin-theme';

/** Tema tersimpan di localStorage. Null bila belum dipilih atau penyimpanan diblokir. */
function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** Tema yang sedang aktif: atribut data-theme pada html, atau preferensi sistem bila kosong. */
function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return letters || 'AD';
}

/**
 * Shell admin berbasis Sidebar shadcn dengan palet netral (kelas admin-theme). Di layar lebar
 * sidebar tampil tetap di kiri. Di layar kecil, sidebar menjadi drawer (Sheet) yang dibuka dari
 * topbar dan ditutup dengan tombol "Tutup menu", klik di luar, atau tombol Escape.
 */
export function AdminLayout() {
  const location = useLocation();
  useSeo({ title: 'Admin', noindex: true });
  const { user } = useAuth();
  const groups = GROUPS.filter((g) => !g.platformOnly || user?.role === 'admin');

  return (
    <SidebarProvider className="admin-theme min-h-screen bg-background">
      <AdminSidebar groups={groups} />
      <SidebarInset className="min-w-0 bg-background">
        <AdminTopBar groups={groups} />
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

/** Topbar template: toggle sidebar, pencarian (⌘K), pengaturan, tema, GitHub, dan avatar. */
function AdminTopBar({ groups }: { groups: NavGroup[] }) {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const expanded = isMobile ? openMobile : open;
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(currentTheme);

  /* Terapkan tema tersimpan saat admin dibuka. Efek anak berjalan sebelum induk, jadi ini ditaruh di sini. */
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* Penyimpanan diblokir: tema tetap berlaku sampai halaman dimuat ulang. */
    }
    setTheme(next);
  }

  function goTo(to: string) {
    setSearchOpen(false);
    navigate(to);
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3 sm:px-6">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 flex-none md:h-9 md:w-9"
          aria-expanded={expanded}
          aria-label="Buka atau tutup menu"
          onClick={toggleSidebar}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>menu</span>
        </Button>

        <Button
          variant="outline"
          className="h-11 min-w-0 flex-1 justify-start gap-2 px-3 font-normal text-muted-foreground md:h-9 md:w-64 md:flex-none"
          onClick={() => setSearchOpen(true)}
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>search</span>
          <span className="sr-only md:not-sr-only md:truncate">Cari menu</span>
          <kbd className="ml-auto hidden rounded border bg-secondary px-1.5 py-0.5 font-sans text-[11px] font-medium text-secondary-foreground md:inline-block">
            ⌘K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-foreground sm:inline-flex"
            nativeButton={false}
            render={<NavLink to="/admin/store" />}
            aria-label="Pengaturan toko"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>settings</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-foreground"
            aria-label={theme === 'dark' ? 'Pakai tema terang' : 'Pakai tema gelap'}
            onClick={toggleTheme}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </Button>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositori Tokoku di GitHub"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-hover sm:inline-flex"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>

          <NavLink
            to="/account"
            aria-label="Akun saya"
            className="ml-1 flex-none rounded-full no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initialsOf(user?.name ?? 'Admin')}
              </AvatarFallback>
            </Avatar>
          </NavLink>
        </div>
      </header>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Cari menu admin"
        description="Ketik nama halaman untuk membukanya."
      >
        <CommandInput placeholder="Cari halaman admin…" />
        <CommandList>
          <CommandEmpty>Tidak ada menu yang cocok.</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g.title} heading={g.title}>
              {g.items.map((it) => (
                <CommandItem key={it.to} value={`${it.label} ${g.title}`} onSelect={() => goTo(it.to)}>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden>{it.icon}</span>
                  {it.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
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
    <Sidebar collapsible="offcanvas" className="border-sidebar-border">
      {/* Latar sidebar dipasang di pembungkus isi, agar berlaku untuk sidebar tetap maupun drawer. */}
      <div className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground">
        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-sidebar-primary text-[22px] text-sidebar-primary-foreground" aria-hidden>
            storefront
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-left font-display text-[17px] leading-[22px] text-sidebar-foreground">Tokoku</strong>
            <span className="block truncate text-left text-xs font-semibold text-muted-foreground">Portal penjual</span>
          </div>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={closeDrawer}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-field text-sidebar-foreground hover:bg-sidebar-hover md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden>close</span>
          </button>
        </div>

        <nav aria-label="Menu admin" className="flex flex-col gap-5">
          {groups.map((g) => (
            <SidebarGroup key={g.title} className="gap-1 p-0">
              <SidebarGroupLabel className="h-auto px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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
          <Separator className="mb-2 bg-sidebar-border" />
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
            className="mt-1 flex h-11 items-center rounded-field border-0 bg-transparent px-3 text-left text-sm font-semibold text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-hover-fg"
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
