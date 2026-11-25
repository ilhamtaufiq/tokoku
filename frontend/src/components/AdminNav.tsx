import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useSeo } from '../lib/seo';

const ITEMS: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/admin', label: 'Ringkasan', icon: 'dashboard', end: true },
  { to: '/admin/orders', label: 'Pesanan', icon: 'receipt_long' },
  { to: '/admin/products', label: 'Produk', icon: 'inventory_2' },
  { to: '/admin/banners', label: 'Banner', icon: 'view_carousel' },
  { to: '/admin/users', label: 'Pengguna', icon: 'group' },
  { to: '/admin/promos', label: 'Promo', icon: 'sell' },
  { to: '/admin/store', label: 'Data toko', icon: 'store' },
];

/** Shell panel admin: sidebar kiri seperti dashboard penjual pada referensi. */
export function AdminLayout() {
  useSeo({ title: 'Admin', noindex: true });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <span className="brand-mark material-symbols-outlined" aria-hidden>storefront</span>
          <div>
            <strong>Tokoku</strong>
            <span>Portal penjual</span>
          </div>
        </div>
        <nav className="admin-nav" aria-label="Menu admin">
          {ITEMS.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}>
              <span className="material-symbols-outlined" aria-hidden>{it.icon}</span>
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-foot">
          <NavLink to="/" className="admin-foot-link">
            <span className="material-symbols-outlined" aria-hidden>arrow_back</span>
            Ke toko
          </NavLink>
          <NavLink to="/account" className="admin-foot-link">
            <span className="material-symbols-outlined" aria-hidden>manage_accounts</span>
            {user?.name ?? 'Akun saya'}
          </NavLink>
          <button
            className="btn ghost small-btn"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Keluar
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
