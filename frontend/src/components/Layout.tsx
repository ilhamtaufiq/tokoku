import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';

const YEAR = new Date().getFullYear();

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });
  const cartCount = (cart.data ?? []).reduce((n, i) => n + i.qty, 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="container bar">
          <Link to="/" className="brand">Tokoku</Link>
          <nav className="nav">
            <NavLink to="/">Katalog</NavLink>
            {user && (
              <>
                <NavLink to="/cart">Keranjang{cartCount > 0 && <span className="badge">{cartCount}</span>}</NavLink>
                <NavLink to="/orders">Pesanan</NavLink>
              </>
            )}
            {user?.role === 'admin' && <NavLink to="/admin/products">Admin</NavLink>}
          </nav>
          <div className="auth">
            {user ? (
              <>
                <span className="muted small">{user.name}</span>
                <button
                  className="btn ghost"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link to="/login" className="btn ghost">Masuk</Link>
            )}
          </div>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container muted small">© {YEAR} Tokoku · Harga sudah termasuk PPN</div>
      </footer>
    </div>
  );
}
