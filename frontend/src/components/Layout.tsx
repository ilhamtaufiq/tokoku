import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { SearchBox } from './SearchBox';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { btnBase, btnPrimary } from './ui/storefront';
import { DEMO_APP_STORES, DEMO_NAV_CATEGORIES } from '../data/demo';

const YEAR = new Date().getFullYear();

const navItem = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-11 items-center rounded-pill px-3.5 text-sm font-semibold no-underline transition-colors duration-150 hover:bg-surface-low hover:text-primary ${
    isActive ? 'bg-primary/10 text-primary' : 'text-ink-2'
  }`;

const mobileItem = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-semibold no-underline ${isActive ? 'text-primary' : 'text-muted'}`;

const footerLink =
  'inline-flex min-h-11 items-center text-sm font-semibold text-ink-2 no-underline transition-colors hover:text-primary';

const footerHeading = 'm-0 font-display text-base font-bold text-ink';

export function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const cartCount = (cart.data ?? []).reduce((n, i) => n + i.qty, 0);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      {/* Strip atas: pengumuman PPN dan tautan cepat */}
      <div className="bg-primary text-on-primary print:hidden">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-2 text-[13px] font-semibold min-[761px]:px-6 max-[760px]:py-1.5 max-[760px]:text-xs">
          <span className="truncate">
            Harga sudah termasuk PPN <span className="max-[760px]:hidden">· Ongkir bebas PPN · Invoice lengkap di setiap pesanan</span><span className="min-[761px]:hidden">· Ongkir bebas PPN</span>
          </span>
          <div className="hidden shrink-0 items-center gap-4 text-xs min-[761px]:flex">
            <Link to="/jual" className="inline-flex min-h-11 items-center text-on-primary/90 no-underline hover:text-on-primary">Jual di Tokoku</Link>
            <span className="text-on-primary/40" aria-hidden>|</span>
            <Link to="/bantuan" className="inline-flex min-h-11 items-center text-on-primary/90 no-underline hover:text-on-primary">Bantuan</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-outline-soft bg-surface shadow-[0_1px_3px_0_rgb(0_0_0/0.05)] print:hidden">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 min-[761px]:px-6 min-[1101px]:h-[76px] min-[1101px]:flex-nowrap min-[1101px]:gap-6 min-[1101px]:py-0">
          <Link
            to="/"
            className="inline-flex min-h-11 flex-none items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink no-underline hover:no-underline"
            aria-label="Tokoku — beranda"
          >
            <span
              className="material-symbols-outlined flex h-10 w-10 flex-none items-center justify-center rounded-field bg-primary text-xl text-on-primary"
              aria-hidden
            >
              storefront
            </span>
            <span className="flex flex-col leading-none">
              <span>Tokoku</span>
            </span>
          </Link>

          <div className="order-3 flex basis-full justify-center min-[1101px]:order-none min-[1101px]:basis-auto min-[1101px]:flex-1">
            <SearchBox />
          </div>

          <nav className="order-2 flex flex-none items-center gap-1 max-[760px]:hidden min-[1101px]:order-none" aria-label="Navigasi utama">
            <NavLink to="/" end className={navItem}>Katalog</NavLink>
            {user && <NavLink to="/orders" className={navItem}>Pesanan</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/products" className={navItem}>Admin</NavLink>}
          </nav>

          <div className="ml-auto flex flex-none items-center gap-2 min-[1101px]:ml-0">
            {user && (
              <NavLink
                to="/cart"
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-outline bg-surface px-3.5 text-sm font-semibold text-ink no-underline hover:border-primary max-[760px]:px-2.5"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden>shopping_cart</span>
                <span className="max-[760px]:hidden">Keranjang</span>
                <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-primary px-1.5 font-mono text-xs font-medium text-on-primary">
                  {cartCount}
                </span>
              </NavLink>
            )}
            {user ? (
              <NavLink
                to="/account"
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-outline py-0 pl-1.5 pr-3.5 text-sm font-semibold text-ink no-underline hover:border-primary"
              >
                <span
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-pill bg-secondary-container font-display text-xs font-bold text-on-secondary-container"
                  aria-hidden
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
              </NavLink>
            ) : (
              <Link to="/login" className={`${btnBase} ${btnPrimary} max-[760px]:hidden`}>Masuk</Link>
            )}
          </div>
        </div>

        {/* Baris kategori (desktop): tautan pencarian per kategori */}
        <div className="hidden border-t border-outline-soft bg-surface-low/70 min-[761px]:block">
          <div className="mx-auto flex h-11 w-full max-w-[1280px] items-center justify-between gap-6 px-6">
            <nav aria-label="Kategori belanja" className="flex min-w-0 items-center gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* DEMO */}
              <span className="flex flex-none items-center gap-2 text-sm font-bold text-primary">
                <span className="material-symbols-outlined text-xl" aria-hidden>menu</span>
                Kategori Belanja
              </span>
              {/* DEMO */}
              {DEMO_NAV_CATEGORIES.map((c) => (
                <Link
                  key={c.q}
                  to={`/?q=${encodeURIComponent(c.q)}#katalog`}
                  className="inline-flex min-h-11 flex-none items-center whitespace-nowrap text-[13px] font-semibold text-ink-2 no-underline hover:text-primary"
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main key={location.pathname} className="animate-fade-up mx-auto w-full max-w-[1280px] flex-1 px-4 pb-12 pt-6 min-[761px]:px-6 min-[761px]:pt-8 max-[760px]:pb-6">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 hidden grid-cols-4 border-t border-outline-soft bg-surface px-1 pb-[calc(6px+env(safe-area-inset-bottom))] pt-1.5 max-[760px]:grid print:hidden"
        aria-label="Navigasi cepat"
      >
        <NavLink to="/" end className={mobileItem}>
          <span className="material-symbols-outlined text-2xl" aria-hidden>home</span>
          <span>Beranda</span>
        </NavLink>
        {user ? (
          <NavLink to="/cart" className={mobileItem}>
            <span className="relative inline-flex">
              <span className="material-symbols-outlined text-2xl" aria-hidden>shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </span>
            <span>Keranjang</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={mobileItem}>
            <span className="material-symbols-outlined text-2xl" aria-hidden>shopping_cart</span>
            <span>Keranjang</span>
          </NavLink>
        )}
        <NavLink to="/orders" className={mobileItem}>
          <span className="material-symbols-outlined text-2xl" aria-hidden>receipt_long</span>
          <span>Pesanan</span>
        </NavLink>
        {user ? (
          <NavLink to="/account" className={mobileItem}>
            <span className="material-symbols-outlined text-2xl" aria-hidden>person</span>
            <span>Akun</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={mobileItem}>
            <span className="material-symbols-outlined text-2xl" aria-hidden>person</span>
            <span>Masuk</span>
          </NavLink>
        )}
      </nav>

      <footer className="mt-16 border-t border-outline-soft bg-surface pb-8 pt-10 max-[760px]:pb-20 print:hidden">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 min-[761px]:px-6">
          <div className="grid grid-cols-1 gap-8 min-[761px]:grid-cols-2 min-[1101px]:grid-cols-5">
            {/* Identitas platform */}
            <div className="flex flex-col gap-4 min-[761px]:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined flex h-9 w-9 items-center justify-center rounded-field bg-primary text-lg text-on-primary" aria-hidden>storefront</span>
                <span className="font-display text-xl font-bold tracking-tight text-ink">Tokoku</span>
              </div>
              {/* DEMO */}
              <p className="m-0 max-w-sm text-sm leading-6 text-ink-2">
                Platform belanja resmi untuk kebutuhan sekolah, guru, siswa, dan pengadaan instansi. Harga transparan termasuk PPN 11%.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className={footerHeading}>Layanan Pelanggan</h2>
              <nav className="flex flex-col" aria-label="Informasi">
                <Link to="/bantuan" className={footerLink}>Bantuan</Link>
                <Link to="/jual" className={footerLink}>Jual di Tokoku</Link>
                <Link to="/pengembalian" className={footerLink}>Pengembalian Dana</Link>
                <Link to="/syarat" className={footerLink}>Syarat &amp; Ketentuan</Link>
                <Link to="/privasi" className={footerLink}>Privasi</Link>
              </nav>
            </div>

            {/* DEMO */}
            <div className="flex flex-col gap-2">
              <h2 className={footerHeading}>Kategori Pilihan</h2>
              <nav className="flex flex-col" aria-label="Kategori pilihan">
                {DEMO_NAV_CATEGORIES.map((c) => (
                  <Link key={c.q} to={`/?q=${encodeURIComponent(c.q)}#katalog`} className={footerLink}>
                    {c.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* DEMO */}
            <div className="flex flex-col gap-3">
              <h2 className={footerHeading}>Download Aplikasi</h2>
              <p className="m-0 text-xs leading-5 text-muted">Akses pesanan dan kelola faktur pajak langsung dari smartphone Anda.</p>
              <div className="flex flex-col gap-2">
                {DEMO_APP_STORES.map((s) => (
                  <span key={s.label} className="flex min-h-11 items-center gap-3 rounded-field border border-outline-soft bg-surface px-3 py-2">
                    <span className="material-symbols-outlined text-2xl text-primary" aria-hidden>{s.icon}</span>
                    <span className="flex flex-col leading-tight">
                      <span className="font-mono text-[10px] uppercase text-muted">{s.caption}</span>
                      <span className="text-sm font-semibold text-ink">{s.label}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-outline-soft pt-5 text-xs text-muted min-[761px]:flex-row min-[761px]:items-center min-[761px]:justify-between">
            <span>© {YEAR} Tokoku · Harga sudah termasuk PPN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
