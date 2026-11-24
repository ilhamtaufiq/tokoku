import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';

const YEAR = new Date().getFullYear();

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const cartCount = (cart.data ?? []).reduce((n, i) => n + i.qty, 0);
  const [search, setSearch] = useState(params.get('q') ?? '');

  return (
    <div className="app">
      <header className="topbar">
        <div className="container bar">
          <Link to="/" className="brand" aria-label="Tokoku — beranda">
            <span className="brand-mark material-symbols-outlined" aria-hidden>storefront</span>
            <span>Tokoku</span>
          </Link>

          <form
            className="header-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = search.trim();
              navigate(q ? `/?q=${encodeURIComponent(q)}#katalog` : '/#katalog');
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>search</span>
            <input
              type="search"
              placeholder="Cari laptop, mouse, tas sekolah, atau buku tulis…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari produk"
            />
          </form>

          <nav className="nav" aria-label="Navigasi utama">
            <NavLink to="/" end>Katalog</NavLink>
            {user && <NavLink to="/orders">Pesanan</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin/products">Admin</NavLink>}
          </nav>

          <div className="auth">
            {user && (
              <NavLink to="/cart" className="cart-btn">
                <span className="material-symbols-outlined" aria-hidden>shopping_cart</span>
                <span>Keranjang</span>
                <span className="badge">{cartCount}</span>
              </NavLink>
            )}
            {user ? (
              <button
                className="btn ghost"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
              >
                Keluar
              </button>
            ) : (
              <Link to="/login" className="btn primary">Masuk</Link>
            )}
          </div>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="muted small">© {YEAR} Tokoku · Harga sudah termasuk PPN</span>
          <nav className="footer-links" aria-label="Informasi">
            <Link to="/syarat">Syarat & Ketentuan</Link>
            <Link to="/privasi">Privasi</Link>
            <Link to="/pengembalian">Pengembalian Dana</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
