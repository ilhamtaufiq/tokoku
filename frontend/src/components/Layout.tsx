import { Link, NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { SearchBox } from './SearchBox';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';

const YEAR = new Date().getFullYear();

export function Layout() {
  const { user } = useAuth();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const cartCount = (cart.data ?? []).reduce((n, i) => n + i.qty, 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="container bar">
          <Link to="/" className="brand" aria-label="Tokoku — beranda">
            <span className="brand-mark material-symbols-outlined" aria-hidden>storefront</span>
            <span>Tokoku</span>
          </Link>

          <SearchBox />

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
              <NavLink to="/account" className="account-link">
                <span className="avatar small" aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
                <span className="account-name">{user.name.split(' ')[0]}</span>
              </NavLink>
            ) : (
              <Link to="/login" className="btn primary">Masuk</Link>
            )}
          </div>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="Navigasi cepat">
        <NavLink to="/" end>
          <span className="material-symbols-outlined" aria-hidden>home</span>
          <span>Beranda</span>
        </NavLink>
        {user ? (
          <NavLink to="/cart">
            <span className="mn-icon">
              <span className="material-symbols-outlined" aria-hidden>shopping_cart</span>
              {cartCount > 0 && <span className="mn-badge">{cartCount}</span>}
            </span>
            <span>Keranjang</span>
          </NavLink>
        ) : (
          <NavLink to="/login">
            <span className="material-symbols-outlined" aria-hidden>shopping_cart</span>
            <span>Keranjang</span>
          </NavLink>
        )}
        <NavLink to="/orders">
          <span className="material-symbols-outlined" aria-hidden>receipt_long</span>
          <span>Pesanan</span>
        </NavLink>
        {user ? (
          <NavLink to="/account">
            <span className="material-symbols-outlined" aria-hidden>person</span>
            <span>Akun</span>
          </NavLink>
        ) : (
          <NavLink to="/login">
            <span className="material-symbols-outlined" aria-hidden>person</span>
            <span>Masuk</span>
          </NavLink>
        )}
      </nav>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="muted small">© {YEAR} Tokoku · Harga sudah termasuk PPN</span>
          <nav className="footer-links" aria-label="Informasi">
            <Link to="/syarat">Syarat & Ketentuan</Link>
            <Link to="/privasi">Privasi</Link>
            <Link to="/pengembalian">Pengembalian Dana</Link>
            <Link to="/bantuan">Bantuan</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
